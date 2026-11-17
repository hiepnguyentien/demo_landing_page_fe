import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos ? 'IOS' : 'ANDROID';
}

const TESTFLIGHT_APP_URL = 'itms-beta://testflight.apple.com/join/5MuXJJfD';
const TESTFLIGHT_WEB_URL = 'https://testflight.apple.com/join/5MuXJJfD';
const GOOGLE_PLAY_APP_URL = 'https://play.google.com/apps/internaltest/4701380010013915536';

function buildIosSchemeUrl(): string | null {
  if (window.location.hash || window.location.href.length > 4096) return null;
  const params = new URLSearchParams(window.location.search);
  if (['click_id', 'affiliate_id', 'screen'].some(key => params.getAll(key).length > 1)) {
    return null;
  }
  const validId = (value: string | null): value is string =>
    value !== null && value.length >= 1 && value.length <= 128 &&
    !/[^A-Za-z0-9._-]/.test(value);
  const clickId = params.get('click_id');
  const affiliateId = params.get('affiliate_id');
  const screen = params.get('screen') ?? 'home';
  if (!validId(clickId) || (affiliateId !== null && !validId(affiliateId)) ||
      !['home', 'ekyc', 'disbursement'].includes(screen)) {
    return null;
  }
  const url = new URL('demoaffiliate://open');
  url.searchParams.set('click_id', clickId);
  if (affiliateId !== null) url.searchParams.set('affiliate_id', affiliateId);
  url.searchParams.set('screen', screen);
  return url.toString();
}

// BE must serve this React app with HTTP 200 at /open instead of redirecting
// iOS to TestFlight. This route never fetches config or records another click.
function IosOpenPage() {
  const appUrl = useMemo(buildIosSchemeUrl, []);
  const launchStarted = useRef(false);
  const [launchError, setLaunchError] = useState(false);

  useEffect(() => {
    if (!appUrl || launchStarted.current) return;
    launchStarted.current = true;
    // Attempt once, immediately, including with React StrictMode effect replay.
    // Safari may require confirmation or block an automatic scheme launch.
    // No timeout-to-store: a pending confirmation is not an installation check.
    try {
      window.location.replace(appUrl);
    } catch {
      setLaunchError(true);
    }
  }, [appUrl]);

  return (
    <main>
      <header className="topbar">
        <span className="brand"><span className="brand-mark">A</span> Affiliate</span>
      </header>
      <section className="hero">
        <div className="download-card">
          <h1>Mở Demo Affiliate</h1>
          {appUrl ? (
            <>
              <p role="status">
                {launchError
                  ? 'Safari chưa mở được ứng dụng. Bạn có thể thử lại bên dưới.'
                  : 'Đang yêu cầu mở ứng dụng. Chọn Mở nếu Safari hỏi xác nhận.'}
              </p>
              <p className="link-hint">Nếu ứng dụng chưa mở, bạn có thể thử lại:</p>
              <a className="open-app-link" href={appUrl}>Mở lại ứng dụng <span>→</span></a>
            </>
          ) : (
            <p className="error-message" role="alert">
              Link giới thiệu thiếu thông tin hoặc không hợp lệ. Vui lòng mở lại link gốc.
            </p>
          )}
          <p>Chưa cài ứng dụng? Cài bản thử nghiệm qua TestFlight.</p>
          <a className="open-app-link" href={TESTFLIGHT_APP_URL}>
            Mở TestFlight để cài <span>→</span>
          </a>
          <p className="link-hint">
            <a href="https://apps.apple.com/app/id899247664">Cài TestFlight</a>
            {' · '}
            <a href={TESTFLIGHT_WEB_URL}>Xem lời mời trên web</a>
          </p>
          <p className="link-hint">Sau khi cài, quay lại link giới thiệu để mở ứng dụng.</p>
        </div>
      </section>
    </main>
  );
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s-]{9,15}$/.test(phone);
}

interface CopyResult {
  success: boolean;
  error?: string;
}

async function copyToClipboard(text: string): Promise<CopyResult> {
  let writeTextError = '';
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err: unknown) {
      writeTextError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
  } else {
    writeTextError = 'navigator.clipboard.writeText không được hỗ trợ';
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    // Tối ưu cho iOS Safari & Android: nằm trong viewport, opacity nhỏ, có kích thước để select được text
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0.01';
    textArea.style.zIndex = '-1';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      return { success: true };
    }
    return {
      success: false,
      error: `writeText: [${writeTextError}] | execCommand('copy'): false`,
    };
  } catch (err: unknown) {
    const execError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return {
      success: false,
      error: `writeText: [${writeTextError}] | execCommand: [${execError}]`,
    };
  }
}

function openAppWithFallback(
  appUrl: string,
  fallbackUrl: string,
  onCleanup?: () => void,
): () => void {
  let timer: number | undefined;
  let finished = false;
  let paused = false;

  function cancelTimer() {
    if (timer) clearTimeout(timer);
  }

  function cleanup() {
    finished = true;
    cancelTimer();

    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', cleanup);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    if (onCleanup) onCleanup();
  }

  function scheduleFallback(delay = 2500) {
    cancelTimer();
    const startedAt = Date.now();

    timer = window.setTimeout(() => {
      if (finished || paused || document.hidden) return;

      // Hộp thoại Safari có thể làm JavaScript bị tạm dừng.
      // Chờ thêm để nhận sự kiện xuống nền nếu app vừa mở.
      if (Date.now() - startedAt > delay + 2000) {
        scheduleFallback(800);
        return;
      }

      cleanup();
      window.location.assign(fallbackUrl);
    }, delay);
  }

  function onVisibility() {
    // Trang xuống nền: có thể app đã mở → huỷ chuyển Store
    if (document.hidden) cleanup();
  }

  function onBlur() {
    // Mất focus có thể chỉ do hộp thoại xác nhận của Safari
    paused = true;
    cancelTimer();
  }

  function onFocus() {
    if (!finished && paused && !document.hidden) {
      paused = false;
      scheduleFallback(800);
    }
  }

  function onPageShow(event: PageTransitionEvent) {
    // Quay lại trang từ bộ nhớ trình duyệt: không chuyển tiếp nữa.
    if (event.persisted) cleanup();
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', cleanup);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);

  scheduleFallback();

  try {
    window.location.assign(appUrl);
  } catch {
    // Nếu trình duyệt từ chối mở app, vẫn giữ nhánh dự phòng.
  }

  return cleanup;
}

function LandingApp() {
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const openAppLinkRef = useRef<HTMLAnchorElement>(null);
  const fallbackCleanupRef = useRef<(() => void) | null>(null);

  const startOpenWithFallback = useCallback((targetAppUrl: string) => {
    if (fallbackCleanupRef.current) {
      fallbackCleanupRef.current();
      fallbackCleanupRef.current = null;
    }

    const storeUrl = deviceOs === 'IOS' ? TESTFLIGHT_APP_URL : GOOGLE_PLAY_APP_URL;
    fallbackCleanupRef.current = openAppWithFallback(targetAppUrl, storeUrl, () => {
      fallbackCleanupRef.current = null;
    });
  }, [deviceOs]);

  useEffect(() => {
    return () => {
      if (fallbackCleanupRef.current) {
        fallbackCleanupRef.current();
        fallbackCleanupRef.current = null;
      }
    };
  }, []);

  const handleActionClick = async (e: React.MouseEvent<HTMLAnchorElement>, targetUrl: string) => {
    // Ngăn trình duyệt nhảy trang ngay để đảm bảo copy clipboard hoàn tất trong user gesture
    e.preventDefault();
    if (clickId) {
      const textToCopy = `affilate_click_id://${clickId}`;
      await copyToClipboard(textToCopy);
    }

    if (targetUrl === appOpenUrl) {
      startOpenWithFallback(targetUrl);
    } else {
      if (fallbackCleanupRef.current) {
        fallbackCleanupRef.current();
        fallbackCleanupRef.current = null;
      }
      window.setTimeout(() => {
        window.location.assign(targetUrl);
      }, 120);
    }
  };

  async function executeRedirect(phoneValue?: string | null) {
    if (!clickId || !partnerId || !publisherId) {
      setFormError('Link giới thiệu thiếu thông tin. Vui lòng kiểm tra lại đường dẫn.');
      return;
    }

    setSubmitting(true);
    try {
      // Copy ngay trong luồng thao tác của người dùng để Safari còn cho phép clipboard.
      const textToCopy = `affilate_click_id://${clickId}`;
      const copyRes = await copyToClipboard(textToCopy);

      // Ghi nhận lượt click từ Landing Page về Backend sau khi thử copy.
      await recordAffiliateClick({
        clickId,
        partnerCode: partnerId,
        pubId: publisherId,
        phone: phoneValue || null,
        os: deviceOs,
      });

      // Chuẩn bị URL thật sau khi ghi nhận click. Thẻ <a> sẽ được auto-click
      // sau 500ms tương tự /test-auto, đồng thời là nút bấm trực tiếp nếu bị chặn.
      const queryParams: Record<string, string> = {
        click_id: clickId,
        screen: 'home',
      };
      if (affiliateId) {
        queryParams.affiliate_id = affiliateId;
      }
      const query = new URLSearchParams(queryParams).toString();

      // Cả iOS và Android đều gọi trực tiếp custom scheme demoaffiliate://open
      // Đảm bảo hoạt động ổn định trên cả Chrome, Safari lẫn các trình duyệt nhúng (Messenger, Zalo)
      const targetUrl = `demoaffiliate://open?${query}`;

      setAppOpenUrl(targetUrl);
      setSubmitting(false);
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Đã có lỗi xảy ra. Bạn vui lòng thử lại.',
      );
      setSubmitting(false);
    }
  }

  // Tự động kích hoạt click thẻ <a> sau 500ms khi link mở app đã sẵn sàng (cơ chế tương tự /test-auto)
  useEffect(() => {
    if (!appOpenUrl) return;

    const timer = window.setTimeout(() => {
      openAppLinkRef.current?.click();
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [appOpenUrl]);

  // Tự động copy click_id ngay khi vừa mở web (kèm fallback ở lần chạm/click đầu tiên)
  useEffect(() => {
    if (!clickId) return;
    const textToCopy = `affilate_click_id://${clickId}`;

    const handleFirstInteraction = () => {
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

        // Tự động chuẩn bị link và kích hoạt mở app nếu không yêu cầu nhập SĐT
        if (!reqPhone && contNav && clickId) {
          void executeRedirect(null);
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

    //copy click_id ngay trong luồng thao tác của người dùng để Safari còn cho phép clipboard.
    if (clickId) {
      const textToCopy = `affilate_click_id://${clickId}`;
      const res = await copyToClipboard(textToCopy);
    } 
    event.preventDefault();
    setFormError('');

    if (requirePhone && !isValidPhone(phone)) {
      setFormError('Vui lòng nhập số điện thoại hợp lệ (9–15 chữ số).');
      return;
    }

    await executeRedirect(
      requirePhone ? phone.replace(/[\s-]/g, '') : null,
    );
  }

  const hasRequiredAttribution = Boolean(clickId && partnerId && publisherId);
  const unavailable = !hasRequiredAttribution || Boolean(configError);

  return (
    <main>
      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          <span className="toast-icon">✓</span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}
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
            <div className="open-app-card-content">
              <p
                role="status"
                style={{
                  fontSize: '14px',
                  color: '#18233a',
                  lineHeight: '1.5',
                  margin: '0 0 14px',
                  textAlign: 'center',
                }}
              >
                {deviceOs === 'IOS'
                  ? 'Đang yêu cầu mở ứng dụng. Hãy chọn "Mở" nếu Safari hỏi xác nhận.'
                  : 'Đang yêu cầu mở ứng dụng...'}
              </p>
              <a
                ref={openAppLinkRef}
                id="openApp"
                className="open-app-link"
                href={appOpenUrl}
                onClick={(e) => void handleActionClick(e, appOpenUrl)}
              >
                Mở ứng dụng <span>→</span>
              </a>
              {deviceOs === 'IOS' && (
                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #edf3f7' }}>
                  <p className="privacy-note" style={{ margin: '0 0 10px', fontSize: '13px' }}>
                    Chưa cài ứng dụng? Cài bản thử nghiệm qua TestFlight:
                  </p>
                  <a
                    className="open-app-link"
                    style={{
                      background: 'white',
                      color: '#244dc9',
                      border: '1px solid #d8dfec',
                      marginTop: '0',
                    }}
                    href={TESTFLIGHT_APP_URL}
                    onClick={(e) => void handleActionClick(e, TESTFLIGHT_APP_URL)}
                  >
                    Mở TestFlight để cài <span>→</span>
                  </a>
                </div>
              )}
              {deviceOs === 'ANDROID' && (
                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #edf3f7' }}>
                  <p className="privacy-note" style={{ margin: '0 0 10px', fontSize: '13px' }}>
                    Chưa cài ứng dụng? Tải bản thử nghiệm qua Google Play:
                  </p>
                  <a
                    className="open-app-link"
                    style={{
                      background: 'white',
                      color: '#244dc9',
                      border: '1px solid #d8dfec',
                      marginTop: '0',
                    }}
                    href={GOOGLE_PLAY_APP_URL}
                    onClick={(e) => void handleActionClick(e, GOOGLE_PLAY_APP_URL)}
                  >
                    Mở Google Play để cài <span>→</span>
                  </a>
                </div>
              )}
            </div>
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

function App() {
  // Separate components keep /open independent of landing attribution fields
  // partner_id/pub_id, API availability, and clipboard permission prompts.
  return getDeviceOs() === 'IOS' && window.location.pathname === '/open'
    ? <IosOpenPage />
    : <LandingApp />;
}

export default App;
