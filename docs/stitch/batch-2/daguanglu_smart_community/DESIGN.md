---
name: DaGuangLu Smart Community
colors:
  surface: '#f3fbfd'
  surface-dim: '#d3dbdd'
  surface-bright: '#f3fbfd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf5f7'
  surface-container: '#e7eff1'
  surface-container-high: '#e2eaec'
  surface-container-highest: '#dce4e6'
  on-surface: '#151d1f'
  on-surface-variant: '#404849'
  inverse-surface: '#2a3234'
  inverse-on-surface: '#eaf2f4'
  outline: '#70797a'
  outline-variant: '#c0c8c9'
  surface-tint: '#36656c'
  primary: '#00363b'
  on-primary: '#ffffff'
  primary-container: '#1b4d53'
  on-primary-container: '#8dbdc3'
  inverse-primary: '#9fcfd6'
  secondary: '#a23e18'
  on-secondary: '#ffffff'
  secondary-container: '#fe8357'
  on-secondary-container: '#6f2000'
  tertiary: '#003825'
  on-tertiary: '#ffffff'
  tertiary-container: '#005138'
  on-tertiary-container: '#7fc3a2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#baebf2'
  primary-fixed-dim: '#9fcfd6'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#1c4d53'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59c'
  on-secondary-fixed: '#390c00'
  on-secondary-fixed-variant: '#822801'
  tertiary-fixed: '#acf1ce'
  tertiary-fixed-dim: '#90d5b3'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005138'
  background: '#f3fbfd'
  on-background: '#151d1f'
  surface-variant: '#dce4e6'
typography:
  headline-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  label-md:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  price:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  number-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
      sans-serif
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

# DaGuangLu Smart Community Design System

## Overview

DaGuangLu Smart Community is a mobile-first design system for community residents and local merchants in Daguang Road, Qinhuai District, Nanjing.

The visual language should feel **modern, warm, trustworthy, calm, and life-oriented**. It should reflect the atmosphere of an established Nanjing neighborhood without turning the interface into a historical-tourism product.

The design should suggest local warmth through restrained references to old-city streets, sycamore-lined neighborhoods, warm masonry, everyday markets, neighborhood services, and multigenerational community life.

The interface must avoid three extremes:

- cold smart-city or cyber-technology aesthetics;
- government-portal or administrative-system aesthetics;
- dense, aggressive marketplace aesthetics associated with large e-commerce platforms.

The preferred style is **restrained mobile minimalism**: generous breathing room, clear information grouping, warm neutral surfaces, strong readability, and obvious interaction targets.

The product serves users of different ages. Resident-facing screens should support natural age-friendliness without looking like a special "elderly mode." Merchant-facing screens should remain compact and efficient without looking like a desktop admin system compressed onto a phone.

### Resident Profile

Resident screens should feel:

- warm;
- approachable;
- life-oriented;
- low to medium density;
- easy to scan;
- easy to tap;
- visually calm.

The resident mini program uses the fixed primary navigation:

**首页｜服务｜商城｜我的**

### Merchant Profile

Merchant screens should feel:

- clear;
- efficient;
- task-oriented;
- restrained;
- medium density;
- status-driven.

The merchant mini program uses the fixed primary navigation:

**工作台｜经营｜订单｜我的**

Resident and merchant screens belong to the same brand system. Do not create separate visual identities for the two products.

## Colors

The palette is built around **Qinhuai Ink Teal**, supported by a restrained brick-red accent and warm neutral backgrounds.

### Primary — Qinhuai Ink Teal `#1B4D53`

Use Primary for:

- primary CTA buttons;
- active bottom-navigation states;
- selected filters;
- important navigation emphasis;
- merchant task actions;
- key progress indicators.

Use `#143B40` for pressed or deeper active states.

Use `#EAF2F3` for soft selected backgrounds, subtle status surfaces, and low-emphasis brand containers.

Primary should remain the visual anchor across both resident and merchant products.

### Secondary — Brick Terracotta `#C85A32`

Secondary is an accent, not a second brand system.

Use it selectively for:

- product prices;
- selected commerce highlights;
- important reminders;
- rejected or attention-required business information where appropriate.

Use `#FAEEE9` for light secondary backgrounds.

Do not turn commerce screens into predominantly red screens.

### Tertiary / Success — Community Green `#2E7256`

Use for:

- successful operations;
- valid or active states;
- completed progress;
- positive confirmations.

Use `#E8F2ED` as its light background.

### Warning `#C76A22`

Use sparingly for:

- pending attention;
- stock warnings;
- time-sensitive but non-error states.

### Error `#BA1A1A`

Use for:

- failure;
- destructive actions;
- invalid states;
- serious errors.

Never communicate state using color alone. Always pair state colors with clear Chinese text.

### Surfaces

Default page background:

`#F8F9FC`

Primary card surface:

`#FFFFFF`

Grouped or inset background:

`#F2F4F6`

Optional warm lifestyle background:

`#FAF8F5`

Warm backgrounds should be used selectively for resident lifestyle content, not randomly across all screens.

### Text

Primary text:

`#191C1E`

Secondary text:

`#5F6769`

Disabled or low-priority text:

`#8B9294`

Avoid extremely light gray text.

Core information must maintain strong visual contrast for older residents and outdoor mobile use.

## Typography

Typography should be simple, native-feeling, and highly legible in Chinese.

Use the system Chinese sans-serif stack defined in the typography tokens.

Do not introduce decorative serif fonts, calligraphy, handwritten fonts, or highly stylized display fonts.

### Hierarchy

**22px / 700 — Page Title**

Use for primary page titles where a custom navigation title is visually present.

**19px / 600 — Section Title**

Use for major page sections and high-level cards.

**17px / 600 — Card Title**

Use for card headings, product/service titles requiring emphasis, and key operational modules.

**16px / 400 — Large Body**

Use for important descriptions, form values, major list content, and key resident-facing information.

**15px / 400 — Standard Body**

Default reading size for normal content.

Core interactive content should generally not be smaller than 15px.

**14px / 400–500 — Labels**

Use for secondary labels, form descriptions, metadata, and compact navigation.

**13px / 500 — Meta**

Reserve for genuinely secondary information such as timestamps or supplementary notes.

Do not create large areas of 12px or smaller text.

### Prices and Numbers

Use the `price` typography token for important commerce prices.

Use `number-lg` only for important dashboard or workbench numbers.

Large numerical typography must remain visually controlled and should not dominate resident-facing screens.

## Layout & Spacing

All screens are designed primarily for a mobile WeChat Mini Program around a 390px logical viewport.

Use a **4px base spacing rhythm**.

### Screen Structure

Standard horizontal screen gutter:

`16px`

Standard card internal padding:

`16px`

Typical spacing between closely related elements:

`8px–12px`

Typical spacing between cards:

`12px–16px`

Typical spacing between major sections:

`20px–24px`

Avoid continuous dense stacks without visible breathing room.

### Touch Targets

Minimum meaningful touch target:

`44px`

Primary button height:

`48px`

Do not reduce interactive areas simply to fit more content on screen.

### Resident Layout

Resident screens should prioritize:

1. core task;
2. common services;
3. supporting information;
4. secondary actions.

Avoid turning the resident home page or service page into an endless information feed.

Quick-entry grids should normally use no more than four items per row.

### Merchant Layout

Merchant screens should prioritize:

1. current status;
2. pending work;
3. next required action;
4. essential business information;
5. secondary details.

Merchant list screens should use mobile cards or structured rows, not desktop tables.

### Safe Areas

Always respect:

- top WeChat navigation/capsule safe areas;
- bottom tab bar;
- bottom safe-area inset;
- fixed bottom action bars.

Scrollable content must not be hidden behind fixed navigation or action areas.

## Elevation & Depth

The design is primarily flat.

Visual hierarchy should come from:

- surface contrast;
- grouping;
- spacing;
- subtle borders;
- restrained shadows.

Standard cards use:

- white surface `#FFFFFF`;
- subtle `#E1E4E6` boundary;
- extremely light shadow when needed.

Recommended shadow character:

`0 2px 8px rgba(27, 77, 83, 0.04)`

Do not use:

- strong floating shadows;
- glossy surfaces;
- glassmorphism;
- neon glow;
- heavy gradients;
- 3D card effects.

Bottom sheets and modals may use a slightly stronger but still soft elevation over the `rgba(25, 28, 30, 0.40)` mask.

## Shapes

Shape language should feel friendly and modern without becoming childish.

### Standard Values

Small tags:

`6px`

Inputs and compact controls:

`10px`

Buttons and utility controls:

`10px–12px`

Standard cards:

`14px`

Large visual containers:

`20px`

Bottom sheets:

`24px` top corners

Filter chips may use fully rounded pill shapes.

Do not mix sharp rectangular components with heavily rounded bubble components in the same screen.

Avoid excessive pill-shaped containers for normal cards or standard buttons.

## Components

### Buttons

Primary buttons:

- background `#1B4D53`;
- white text;
- height `48px`;
- medium rounded corners;
- strong, clear visual priority.

Normally use only one dominant primary action within a local task context.

Secondary buttons should use either:

- white background with primary text/border;
- light primary background with dark primary text.

Destructive actions use error red and should never compete visually with the primary action unless destruction is the sole purpose of the screen.

### Cards

Standard cards:

- white background;
- 14px radius;
- 16px internal padding;
- subtle border;
- minimal shadow.

Cards should represent meaningful content grouping, not decorate every individual row.

Avoid excessive nested cards.

### Chips and Status Tags

Status tags should use:

- low-saturation tinted backgrounds;
- darker semantic text;
- compact but readable spacing.

Examples:

- active / valid → green family;
- pending / processing → primary or warning family;
- rejected / failed → error or brick-red family.

Always include explicit status text.

### Lists

List rows should maintain a comfortable vertical rhythm and clear tap affordance.

Icons must be paired with Chinese labels when they represent navigation or actions.

Use dividers lightly.

Do not rely on tiny chevrons or icon-only controls as the only discoverability signal.

### Inputs and Forms

Form inputs use:

- white surface;
- subtle border;
- 10px–12px radius;
- clear persistent labels;
- readable input text;
- generous vertical spacing.

For long mobile forms:

- group related fields into sections;
- prefer selectors and bottom sheets where appropriate;
- avoid reproducing dense desktop forms.

Error messages should appear near the affected field and use simple Chinese explanations.

### Bottom Navigation

Resident:

**首页｜服务｜商城｜我的**

Merchant:

**工作台｜经营｜订单｜我的**

Use a fixed four-item bottom navigation.

Each item combines:

- a simple icon;
- a text label.

Active state uses the Primary color.

Inactive items use secondary neutral text.

Do not create a floating oversized center action button.

### Bottom Action Bar

For transaction and form pages, fixed bottom actions should:

- respect safe-area inset;
- clearly separate primary and secondary actions;
- avoid more than two major actions whenever possible.

Primary CTA should remain visually dominant.

### Product Cards

Product cards should stay restrained.

Show only information necessary for decision-making, typically:

- product image;
- product name;
- merchant name when relevant;
- price;
- at most one important fulfillment/status label;
- simple action.

Do not automatically add:

- coupons;
- discount countdowns;
- sales rankings;
- crossed-out original prices;
- multiple promotional badges;
- livestream indicators.

### Order and Status Screens

Status-oriented pages should make this hierarchy obvious:

1. what state the item is currently in;
2. what it means;
3. what the user should do next.

Use a clear status header and one obvious primary next action.

Avoid exposing technical backend state names directly to ordinary residents or merchants unless required by the page prompt.

### Bottom Sheets

Use Bottom Sheets for:

- SKU selection;
- filters;
- simple option selection;
- confirmation;
- compact secondary forms.

Use 20px–24px top corner radii and a restrained overlay.

Keep actions large and easy to understand.

## Do's and Don'ts

### Do

- Do preserve Qinhuai Ink Teal `#1B4D53` as the single primary brand anchor.
- Do use Brick Terracotta `#C85A32` only as a supporting accent.
- Do maintain strong text contrast and comfortable typography.
- Do design for multigenerational community users.
- Do keep resident screens visually calm and approachable.
- Do keep merchant screens task-first and operationally efficient.
- Do use clear Chinese text next to icons.
- Do prefer one obvious primary action per task area.
- Do reuse established components and visual patterns across screens.
- Do use warm community photography and everyday local-life imagery when imagery is useful.
- Do preserve the fixed resident and merchant bottom-navigation structures.
- Do follow the current page prompt for screen-specific content and states.

### Don't

- Don't create a government portal or administrative-dashboard appearance.
- Don't use government blue as a dominant theme.
- Don't create cyber-tech, neon, futuristic, or smart-city-dashboard visuals.
- Don't create faux-historical Qinhuai tourism visuals such as lantern overload, calligraphy, ancient patterns, decorative seals, or scenic-site styling.
- Don't create high-density Taobao, JD, Meituan, or livestream-commerce styling.
- Don't make red the dominant commerce brand color.
- Don't use tiny gray text to increase information density.
- Don't create desktop tables inside merchant mobile pages.
- Don't overuse cards, shadows, gradients, pills, badges, or decorative icons.
- Don't introduce a second visual system for merchant screens.
- Don't redesign colors, typography, spacing, card shapes, or bottom navigation when generating a new screen.
- Don't invent business roles, workflows, approval actors, financial mechanisms, or platform policies from visual context.
- Don't treat regional visual identity as evidence that street offices, community staff, grid workers, banks, or government organizations participate in a business process.
- Don't override screen-specific requirements supplied in the page-generation prompt.