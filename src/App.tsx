import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DeviceOs,
  getAffiliateConfig,
  recordAffiliateClick,
} from './services/affiliateApi';
import './styles.css';

function getClickId(): string {
  return new URLSearchParams(window.location.search).get('click_id')?.trim() ?? '';
}

function getAffiliateId(): string {
  return new URLSearchParams(window.location.search).get('affiliate_id')?.trim() ?? '';
}

function getPartnerId(): string {
  return new URLSearchParams(window.location.search).get('partner_id')?.trim() ?? '';
}

function getPublisherId(): string {
  return new URLSearchParams(window.location.search).get('pub_id')?.trim() ?? '';
}

function getDeviceOs(): DeviceOs {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ? 'IOS' : 'ANDROID';
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s-]{9,15}$/.test(phone);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

function App() {
  const clickId = useMemo(getClickId, []);
  const affiliateId = useMemo(getAffiliateId, []);
  const partnerId = useMemo(getPartnerId, []);
  const publisherId = useMemo(getPublisherId, []);
  const deviceOs = useMemo(getDeviceOs, []);
  const [requirePhone, setRequirePhone] = useState(true);
  const [, setContinuousNavigate] = useState(false);
  const [phone, setPhone] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appOpenUrl, setAppOpenUrl] = useState('');
  const [configError, setConfigError] = useState('');
  const [formError, setFormError] = useState('');

  async function executeRedirect(phoneValue?: string | null, autoOpen = false) {
    if (!clickId || !partnerId || !publisherId) {
      setFormError('Link giới thiệu thiếu thông tin. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }

    setSubmitting(true);
    try {
      // Copy ngay trong luồng thao tác của người dùng để Safari còn cho phép clipboard.
      const textToCopy = `affilate_click_id://${clickId}`;
      await copyToClipboard(textToCopy);

      // Ghi nhận lượt click từ Landing Page về Backend sau khi thử copy.
      await recordAffiliateClick({
        clickId,
        partnerCode: partnerId,
        pubId: publisherId,
        phone: phoneValue || null,
        os: deviceOs,
      });

      // Chuẩn bị URL thật sau khi ghi nhận click. Người dùng bấm thẻ <a>
      // ở bước tiếp theo để iOS nhận đúng thao tác Universal Link trực tiếp.
      const queryParams: Record<string, string> = {
        click_id: clickId,
        screen: 'home',
      };
      if (affiliateId) {
        queryParams.affiliate_id = affiliateId;
      }
      const query = new URLSearchParams(queryParams).toString();

      let targetUrl: string;
      if (deviceOs === 'ANDROID') {
        const packageId = 'com.blt.demoaffiliate';
        // Link Google Play Internal Test
        const fallbackUrl = 'https://play.google.com/apps/internaltest/4701380010013915536';

        targetUrl =
          `intent://demo-mkt-aff.bluetechnology.vn/open?${query}` +
          `#Intent;scheme=https;package=${packageId};` +
          `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
      } else {
        // Dùng host khác landing để iOS Safari có thể mở app qua Universal Link.
        const iosAppLink = new URL('/open', 'https://demo-aff.bluetechnology.vn');
        iosAppLink.searchParams.set('click_id', clickId);
        if (affiliateId) {
          iosAppLink.searchParams.set('affiliate_id', affiliateId);
        }
        iosAppLink.searchParams.set('screen', 'home');
        targetUrl = iosAppLink.toString();
      }

      setAppOpenUrl(targetUrl);
      setSubmitting(false);
      if (autoOpen) {
        window.location.assign(targetUrl);
      }
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Đã có lỗi xảy ra. Bạn vui lòng thử lại.',
      );
      setSubmitting(false);
    }
  }

  // Tự động copy click_id ngay khi vừa mở web (kèm fallback ở lần chạm/click đầu tiên)
  useEffect(() => {
    if (!clickId) return;
    const textToCopy = `affilate_click_id://${clickId}`;
    void copyToClipboard(textToCopy);

    const handleFirstInteraction = () => {
      void copyToClipboard(textToCopy);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [clickId]);

  useEffect(() => {
    let active = true;
    getAffiliateConfig()
      .then((affiliateConfig) => {
        if (!active) return;
        const reqPhone = Boolean(affiliateConfig.requirePhone);
        const contNav = Boolean(affiliateConfig.continuousNavigate);
        setRequirePhone(reqPhone);
        setContinuousNavigate(contNav);

        // iOS cần lần bấm trực tiếp vào Universal Link; Android vẫn mở Intent sau khi ghi nhận.
        if (!reqPhone && contNav && clickId) {
          executeRedirect(null, deviceOs === 'ANDROID');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setConfigError(
            error instanceof Error
              ? error.message
              : 'Không thể tải cấu hình. Vui lòng thử lại.',
          );
        }
      })
      .finally(() => {
        if (active) setConfigLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clickId, affiliateId, partnerId, publisherId, deviceOs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (requirePhone && !isValidPhone(phone)) {
      setFormError('Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).');
      return;
    }

    await executeRedirect(requirePhone ? phone.replace(/[\s-]/g, '') : null);
  }

  const hasRequiredAttribution = Boolean(clickId && partnerId && publisherId);
  const unavailable = !hasRequiredAttribution || Boolean(configError);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Finora trang chủ">
          <span className="brand-mark">A</span>
          <span>Affiliate</span>
        </a>
      </header>

      <section className="hero">
        <div className="download-card">
          {configLoading ? (
            <div className="loading-message">Đang chuẩn bị trải nghiệm...</div>
          ) : submitting ? (
            <div className="loading-message">Đang chuẩn bị liên kết mở ứng dụng...</div>
          ) : appOpenUrl ? (
            <a className="open-app-link" href={appOpenUrl}>
              Mở ứng dụng <span>→</span>
            </a>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {requirePhone && (
                <label className="field">
                  <span>Số điện thoại</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Nhập số điện thoại của bạn"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={submitting || unavailable}
                    aria-invalid={Boolean(formError)}
                  />
                </label>
              )}
              {(configError || formError) && (
                <p className="error-message" role="alert">{configError || formError}</p>
              )}
              <button type="submit" disabled={submitting || unavailable}>
                {submitting ? 'Đang xử lý...' : 'Tải ứng dụng ngay'} <span>→</span>
              </button>
            </form>
          )}
          {!hasRequiredAttribution && !configLoading && (
            <p className="link-hint">Link giới thiệu thiếu thông tin hoặc không hợp lệ.</p>
          )}
        </div>
      </section>

      <section className="benefits" aria-label="Lợi ích của Finora">
        <div className="benefit-grid">
          <article><span className="benefit-icon clock">◷</span><h3>Nhanh chóng</h3><p>Đăng ký dễ dàng, duyệt hồ sơ nhanh chóng.</p></article>
          <article><span className="benefit-icon lock">⌑</span><h3>Minh bạch</h3><p>Thông tin rõ ràng, không phí ẩn, không bất ngờ.</p></article>
          <article><span className="benefit-icon heart">♡</span><h3>Đồng hành</h3><p>Hỗ trợ tận tâm trong suốt hành trình của bạn.</p></article>
        </div>
      </section>
    </main>
  );
}

export default App;
