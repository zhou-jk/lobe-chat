'use client';

import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import { PropsWithChildren, memo, useEffect, useMemo, useState } from 'react';
import { isRtlLang } from 'rtl-detect';

import { createI18nNext } from '@/locales/create';
import { isOnServerSide } from '@/utils/env';
import { getAntdLocale } from '@/utils/locale';

const updateDayjs = async (lang: string) => {
  // load default lang
  let dayJSLocale;
  try {
    // dayjs locale is using `en` instead of `en-US`
    // refs: https://github.com/lobehub/lobe-chat/issues/3396
    const locale = lang!.toLowerCase() === 'en-us' ? 'en' : lang!.toLowerCase();

    dayJSLocale = await import(`dayjs/locale/${locale}.js`);
  } catch {
    console.warn(`dayjs locale for ${lang} not found, fallback to en`);
    dayJSLocale = await import(`dayjs/locale/en.js`);
  }

  dayjs.locale(dayJSLocale.default);
};

interface LocaleLayoutProps extends PropsWithChildren {
  antdLocale?: any;
  defaultLang?: string;
}

const Locale = memo<LocaleLayoutProps>(({ children, defaultLang, antdLocale }) => {
  const [lang, setLang] = useState(defaultLang);
  const [locale, setLocale] = useState(antdLocale);

  const i18n = useMemo(() => {
    const instance = createI18nNext(defaultLang);

    // if run on server side, init i18n instance everytime
    if (isOnServerSide) {
      instance.init();
    } else {
      // if on browser side, init i18n instance only once
      if (!instance.instance.isInitialized) {
        instance.init().then(async () => {
          if (!lang) return;

          await updateDayjs(lang);
        });
      }
    }

    return instance;
  }, [defaultLang]);

  // handle i18n instance language change
  useEffect(() => {
    const handleLang = async (lng: string) => {
      setLang(lng);

      if (lang === lng) return;

      const newLocale = await getAntdLocale(lng);
      setLocale(newLocale);

      await updateDayjs(lng);
    };

    i18n.instance.on('languageChanged', handleLang);
    return () => {
      i18n.instance.off('languageChanged', handleLang);
    };
  }, [i18n, lang]);

  // detect document direction
  const documentDir = isRtlLang(lang!) ? 'rtl' : 'ltr';

  return (
    <ConfigProvider direction={documentDir} locale={locale}>
      {children}
    </ConfigProvider>
  );
});

Locale.displayName = 'Locale';

export default Locale;
