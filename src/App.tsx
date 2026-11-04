import { FormEvent, useEffect, useMemo, useState } from 'react';
import { config } from './config';
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

function getDeviceOs(): DeviceOs {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ? 'IOS' : 'ANDROID';
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s-]{9,15}$/.test(phone);
}

function App() {
  const clickId = useMemo(getClickId, []);
  const affiliateId = useMemo(getAffiliateId, []);
  const deviceOs = useMemo(getDeviceOs, []);
  const [requirePhone, setRequirePhone] = useState(true);
  const [phone, setPhone] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configError, setConfigError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    getAffiliateConfig()
      .then((affiliateConfig) => {
        if (active) setRequirePhone(affiliateConfig.requirePhone);
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
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!clickId) {
      setFormError('Link giới thiệu không hợp lệ. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }
    if (requirePhone && !isValidPhone(phone)) {
      setFormError('Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Ghi nhận lượt click từ Landing Page về Backend
      await recordAffiliateClick({
        clickId,
        phone: requirePhone ? phone.replace(/[\s-]/g, '') : null,
        os: deviceOs,
      });

      // 2. Tự động copy mã clickId vào Clipboard làm fallback cho Mobile App
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(clickId);
        }
      } catch {
        // Trình duyệt không cấp quyền clipboard thì bỏ qua
      }

      // 3. Điều hướng mở App hoặc Store theo hệ điều hành
      if (deviceOs === 'ANDROID') {
        // Android Chrome Intent:
        // - Nếu đã cài app: Mở thẳng app ngay lập tức
        // - Nếu chưa cài app: Mở Google Play Store kèm referrer
        const packageId = 'com.example.demo_affiliate';
        const queryParams: Record<string, string> = {
          click_id: clickId,
          screen: 'home',
        };
        if (affiliateId) {
          queryParams.affiliate_id = affiliateId;
        }
        const query = new URLSearchParams(queryParams).toString();

        const playUrl =
          `https://play.google.com/store/apps/details?id=${packageId}` +
          `&referrer=${encodeURIComponent(query)}`;

        const intentUrl =
          `intent://demo-mkt-aff.bluetechnology.vn/open?${query}` +
          `#Intent;scheme=https;package=${packageId};` +
          `S.browser_fallback_url=${encodeURIComponent(playUrl)};end`;

        window.location.assign(intentUrl);
      } else {
        // iOS: Sử dụng Universal Link /open (hoặc fallback sang App Store)
        const baseUrl = config.apiBaseUrl || window.location.origin;
        const openUrl = new URL('/open', baseUrl);
        openUrl.searchParams.set('click_id', clickId);
        if (affiliateId) {
          openUrl.searchParams.set('affiliate_id', affiliateId);
        }
        openUrl.searchParams.set('screen', 'home');

        window.location.assign(openUrl.toString());
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

  const unavailable = !clickId || Boolean(configError);

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
          {!clickId && !configLoading && (
            <p className="link-hint">Vui lòng truy cập từ link giới thiệu hợp lệ.</p>
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
