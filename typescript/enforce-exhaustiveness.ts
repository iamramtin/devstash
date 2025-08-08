// Enforce exhaustiveness in switch statements

const colors = [
  "Koopa Troopa Green",
  "Blastoise Blue",
  "Gerudo Sunset",
  "Jigglypuff Bubblegum",
] as const;

type Color = (typeof colors)[number];

function toRGB(color: Color): string {
  switch (color) {
    case "Koopa Troopa Green":
      return "#6abe30";
    case "Blastoise Blue":
      return "#2a66b0";
    case "Gerudo Sunset":
      return "#e97451";
    case "Jigglypuff Bubblegum":
      return "#ffdafa";
    default:
      return assertUnreachable(color);
  }

  // Alternative (stricter):
  // const _: never = color;
}

function assertUnreachable(x: never): never {
  throw new Error(`Unhandled case: ${x}`);
}

// Example usage
export function demoExhaustiveness() {
  for (const color of colors) {
    console.log(`${color} → ${toRGB(color)}`);
  }
}

// Uncomment to test directly
// demoExhaustiveness();

/*
If you add a new color to `colors` but don't handle it in `toRGB`,
TypeScript will raise a compile-time error at the `default` branch.
*/
