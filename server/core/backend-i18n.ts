import { config } from '../config'
import { I18nService } from './i18n'

export const backendI18n = new I18nService(config.locale.backend, config.locale.fallback)
