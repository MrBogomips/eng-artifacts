"""Color math for the structural tests (standard library only): hex parsing, oklab mixing as CSS
color-mix(in oklab) does it, WCAG relative luminance and contrast ratio, and OKLCH hue."""
import math
import re


def parse_hex(value):
    v = value.strip().lstrip("#")
    if len(v) in (3, 4):
        v = "".join(c * 2 for c in v)
    if len(v) not in (6, 8) or not re.match(r"^[0-9a-fA-F]+$", v):
        raise ValueError("not a hex color: %s" % value)
    return tuple(int(v[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gamma(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def to_oklab(rgb):
    r, g, b = (_lin(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def from_oklab(lab):
    L, a, b = lab
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (_gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            _gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            _gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s))


def mix(fg_hex, pct, bg_hex):
    """color-mix(in oklab, fg pct%, bg): rgb floats."""
    p = pct / 100.0
    f, g = to_oklab(parse_hex(fg_hex)), to_oklab(parse_hex(bg_hex))
    return from_oklab(tuple(f[i] * p + g[i] * (1 - p) for i in range(3)))


def luminance(rgb):
    r, g, b = (_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(rgb1, rgb2):
    a, b = luminance(rgb1), luminance(rgb2)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def hue(hex_value):
    """OKLCH hue in degrees."""
    _, a, b = to_oklab(parse_hex(hex_value))
    return math.degrees(math.atan2(b, a)) % 360
