import { backendI18n } from './backend-i18n'

const dynamicLiteralMatchers: Array<readonly [RegExp, string]> = [
  [/^COT=(\d+)$/u, 'COT={value}'],
  [/^QRP=(\d+)$/u, 'QRP={value}'],
  [/^QCC=(\d+)$/u, 'QCC={value}'],
  [/^FC=(\d+)$/u, 'FC={value}'],
  [/^LSQ=(\d+)$/u, 'LSQ={value}'],
  [/^COI=(\d+)$/u, 'COI={value}'],
  [/^QOI=(\d+)$/u, 'QOI={value}'],
  [/^第(\d+)节$/u, '第{value}节'],
  [/^文件#(\d+)$/u, '文件#{value}'],
  [/^未知\((.+)\)$/u, '未知({value})'],
  [/^错误原因=(.+)$/u, '错误原因={value}'],
  [/^目录响应\((\d+)个文件\)$/u, '目录响应({value}个文件)'],
  [/^文件目录响应\((\d+)个文件\)$/u, '文件目录响应({value}个文件)'],
  [/^召唤文件目录请求\((.+)\)$/u, '召唤文件目录请求({value})'],
  [/^文件段落\((\d+)字节数据\)$/u, '文件段落({value}字节数据)'],
  [/^文件服务附加包类型(.+)$/u, '文件服务附加包类型{value}'],
]

function localizeDynamicString(value: string) {
  for (const [pattern, template] of dynamicLiteralMatchers) {
    const match = pattern.exec(value)
    if (match) return backendI18n.translateLiteral(template, { value: match[1] })
  }

  return backendI18n.translateLiteral(value)
}

export function localizeParserValue<T>(input: T): T {
  if (typeof input === 'string') return localizeDynamicString(input) as T

  if (Array.isArray(input)) {
    return input.map((item) => localizeParserValue(item)) as T
  }

  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = localizeParserValue(value)
    }
    return result as T
  }

  return input
}
