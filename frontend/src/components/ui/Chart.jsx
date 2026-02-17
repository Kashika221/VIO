'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

const THEMES = { light: '', dark: '.dark' }

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a ChartContainer')
  }
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config, id: chartId }}>
      <div
        data-chart={chartId}
        className={cn(
          'relative flex w-full flex-col gap-2',
          className
        )}
        {...props}
      >
        {children}
        <ChartStyle id={chartId} config={config} />
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([, value]) => value.theme || value.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: colorConfig
          .map(([key, value]) => {
            const color =
              value.color ??
              value.theme?.light ??
              'hsl(var(--primary))'
            const darkColor =
              value.theme?.dark ?? color

            const variable = `--color-${key}`

            return Object.entries(THEMES)
              .map(([theme, selector]) => {
                const themeColor =
                  theme === 'dark' ? darkColor : color
                return `${selector} [data-chart=${id}] { ${variable}: ${themeColor}; }`
              })
              .join('\n')
          })
          .join('\n'),
      }}
    />
  )
}

function ChartTooltipContent({
  className,
  label,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  formatter,
  ...props
}) {
  const { config } = useChart()
  const payload = props.payload?.filter(
    (item) => item.type === 'line' || item.type === 'bar' || item.type === 'area'
  )

  if (!payload?.length) {
    return null
  }

  const tooltipLabel =
    label ?? props.label ?? payload[0].payload?.name

  return (
    <div
      className={cn(
        'grid gap-1.5 rounded-md border bg-popover px-3 py-2 text-xs shadow-md',
        className
      )}
    >
      {!hideLabel && tooltipLabel && (
        <div className="font-medium text-foreground">
          {tooltipLabel}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          const key = item.dataKey
          const conf = config[key] ?? {}
          const value = formatter
            ? formatter(item.value, item, index)
            : item.value

          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                {!hideIndicator && (
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      indicator === 'line' && 'h-0.5 w-3',
                      indicator === 'square' && 'rounded-none'
                    )}
                    style={{
                      backgroundColor:
                        item.color ?? `var(--color-${key})`,
                    }}
                  />
                )}
                <span className="text-muted-foreground">
                  {conf.label ?? key}
                </span>
              </div>
              <span className="font-medium tabular-nums">
                {value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartLegendContent({ className, hideIcon = false, ...props }) {
  const { config } = useChart()
  const payload = props.payload ?? []

  if (!payload.length) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 text-xs',
        className
      )}
    >
      {payload.map((item, index) => {
        const conf = config[item.value] ?? {}
        const Icon = conf.icon

        return (
          <div
            key={`${item.value}-${index}`}
            className="flex items-center gap-1.5"
          >
            {!hideIcon && Icon && (
              <Icon className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    item.color ?? `var(--color-${item.value})`,
                }}
              />
              <span className="text-muted-foreground">
                {conf.label ?? item.value}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartStyle,
  ChartTooltipContent,
  ChartLegendContent,
  useChart,
}
