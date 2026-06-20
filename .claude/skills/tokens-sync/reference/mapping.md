# Figma Variables → W3C DTCG mapping

How to convert `mcp__Figma__get_variable_defs` output into `tokens.json`.

## Names → structure
Figma variable names use `/` as a group separator. Each segment becomes a nested object key.

```
primitives/space/8                  → primitives.space.8
semantic/action/primary/default     → semantic.action.primary.default
component/button/danger/bg/hover     → component.button.danger.bg.hover
```

## Values → `$type` / `$value`

| Figma value (resolved) | DTCG `$type` | DTCG `$value` | Notes |
|---|---|---|---|
| `#9cfb04`, `rgba(...)` | `color` | `"#9cfb04"` | keep hex; preserve alpha if present |
| `8`, `12` (space/radius) | `dimension` | `"8px"` | append `px` to bare numbers |
| `9999` (radius/full) | `dimension` | `"9999px"` | |
| `Font(family: "Inter", style: Semi Bold, size: 13, weight: 600, lineHeight: 20, letterSpacing: 0)` | `typography` | composite (below) | |

### Typography composite
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": "Inter",
    "fontWeight": 600,
    "fontSize": "13px",
    "lineHeight": "20px",
    "letterSpacing": "0px"
  }
}
```
`size`/`lineHeight`/`letterSpacing` numbers get `px`; `weight` stays numeric.
The config emits these as a CSS `font` shorthand: `600 13px/20px Inter`.

## Aliases / references
The Dev Mode MCP returns **resolved** values, so the primitive→semantic→component
reference chain is flattened. When you can confidently identify the source token
(same value + matching semantic intent), express it as a DTCG reference instead of a
raw value so renames ripple automatically:

```json
"bg": { "default": { "$type": "color", "$value": "{semantic.action.primary.default}" } }
```

Otherwise store the resolved value. (A full reference graph requires the Figma
Variables REST API or a token-export plugin — note that in the report.)

## Naming conflicts (token vs group)
If Figma has both `…/text` (a value) and `…/text/disabled` (a group), JSON can't make
`text` both a leaf and an object. Normalize to `text.default` + `text.disabled`
and mention the normalization in the report.

## Modes
`get_variable_defs` returns the **active** mode only (e.g. Dark). For multi-mode
(light/dark) output, capture each mode separately (select the other mode in Figma, or
use the REST API) — do not guess the other mode's values.
