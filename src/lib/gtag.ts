// Google Ads conversion tracking utility

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export const trackConversion = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17522921333/-tI6COyW45EbEPWeyqNB',
      'value': 1.0,
      'currency': 'IDR'
    });
  }
};
