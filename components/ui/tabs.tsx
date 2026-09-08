"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit max-w-full items-end justify-start overflow-x-auto [scrollbar-width:none] group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col [&::-webkit-scrollbar]:hidden",
  {
    variants: {
      variant: {
        default: "gap-6 border-b border-border/80 bg-transparent p-0",
        line: "gap-6 border-b border-border/80 bg-transparent p-0",
        pill: "gap-1 rounded-lg border border-border/80 bg-secondary/50 p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 text-sm font-semibold tracking-wide whitespace-nowrap transition-colors duration-150 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Underline / default + line
        "group-data-[variant=default]/tabs-list:px-1 group-data-[variant=default]/tabs-list:pb-3 group-data-[variant=default]/tabs-list:text-muted-foreground group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:text-muted-foreground group-data-[variant=line]/tabs-list:hover:text-foreground group-data-[variant=line]/tabs-list:data-active:text-foreground",
        // Pill
        "group-data-[variant=pill]/tabs-list:rounded-md group-data-[variant=pill]/tabs-list:px-3.5 group-data-[variant=pill]/tabs-list:py-2 group-data-[variant=pill]/tabs-list:text-foreground/60 group-data-[variant=pill]/tabs-list:hover:text-foreground group-data-[variant=pill]/tabs-list:data-active:bg-primary group-data-[variant=pill]/tabs-list:data-active:text-primary-foreground group-data-[variant=pill]/tabs-list:data-active:shadow-sm",
        // Gold underline indicator
        "after:absolute after:bg-accent after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-[variant=default]/tabs-list:data-active:after:opacity-100 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
