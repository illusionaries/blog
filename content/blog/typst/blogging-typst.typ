ScantPress is now with functional Typst support! You are reading a blog post written entirely in Typst (although frontmatter is provided by an additional YAML file).

#let expander(header, body) = html.elem("ExpanderComponent", attrs: (class: "expander", ":initial-collapsed": "true"))[
  #html.elem("template", attrs: ("#header": ""), html.elem(
    "span",
    attrs: (class: "font-bold text-sm p-y-4"),
    header,
  ))
  #body
]

= What Can We Do Now?

Following features have already been implemented:
- Math equations
  - Inline: $E = m c^2$
  - Block:
    $
      F & = overline(A) B + A overline(B) \
        & = A xor B
    $
  - Very long block:
    $
      A = a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_10 + a_11 + a_12 + a_13 + a_14 + a_15 + a_16 + a_17 + a_18 + a_19 + a_20
    $
- Page outline
  - See for your self on the right!
- Git history
  - Look down...
- Alignments
  - Only for `left`, `center`, `right`
  - #align(left, `left`)
  - #align(center, `center`)
  - #align(right, `right`)
- UnoCSS
  - #html.span("This is red, bold text.", class: "text-red-500 font-bold")
  - #expander("UnoCSS Code")[
      ```typ
      #html.span("This is red, bold text.", class: "text-red-500 font-bold")
      ```
    ]

You can also use Vue components, as the Typst content will be transformed into Vue SFC!

#expander("Showcasing Vue Component", [
  ```typ
  #html.elem("ExpanderComponent", attrs: (class: "expander", ":initial-collapsed": "true"))[
    #html.elem("template", attrs: ("#header": ""), html.elem(
      "span",
      attrs: (class: "font-bold text-sm p-y-4"),
      "Showcasing Vue Component")
    )[
    It's a bit ugly though
  ]
  ```

  It's a bit ugly though, as the expander component is designed for markdown files with shorthand, but...

  You can use `#let` to make it better!

  ```typ
  #let expander(header, body) = html.elem("ExpanderComponent", attrs: (class: "expander", ":initial-collapsed": "true"))[
    #html.elem("template", attrs: ("#header": ""), html.elem(
      "span",
      attrs: (class: "font-bold text-sm p-y-4"),
      header,
    ))
    #body
  ]
  ```
])



= Problems?

+ Unordered lists look very very odd... I don't know how to fix it yet.
+ Typst is responsible for coloring the codeblocks now, and the color scheme is inconsistent with Shiki (also very ugly in dark mode).
  ```cpp
  #include <iostream>
  int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
  }
  ```
+ The `#html.elem` function transforms element tags into lowercase. Headache for Vue components with PascalCase names. I have mapped built-in components (`ExpanderComponent`, `ClientOnly`, `Badge`) already.
+ Actually you will be limited to built-in components, as you can't write `script setup` for now (purely because of our limitation, not Typst's).
+ Figures are working, but I haven't wrote any CSS to make it look good yet.
+ Inline math equations are a bit off the baseline.

= Plans?

Probably not in the near future, but here are some:

+ `#scale()`
+ Excerpt;
+ More alignments;
+ Frontmatter with `#metadata()` function, instead of YAML file. This will make the content more self-contained;

= One More Thing...

You can import Typst packages! If there are some compatibility issues, try wrapping it with `#html.frame()`. Here's a quick demo of `circuiteria` package:

#import "@preview/circuiteria:0.2.0"

#let circuit(..args) = html.div(style: "overflow-x: auto", html.frame(circuiteria.circuit(..args)))

#circuit({
  import circuiteria.element: *
  import circuiteria.wire: *
  let cmp(x, y, id) = block(
    x: x,
    y: y,
    w: 3,
    h: 4,
    id: id,
    name: rotate(270deg, reflow: true)[Magnitude \ Comparator],
    ports: (
      west: ((id: "a", name: "a"), (id: "b", name: "b")),
      east: ((id: "gt", name: "gt"),),
    ),
  )

  let mux(x, y, id) = multiplexer(
    x: x,
    y: y,
    w: 1.5,
    h: 2.5,
    entries: ($1$, $0$),
    name: rotate(270deg, reflow: true)[Mux],
    id: id,
  )

  cmp(0, 0, "cmp1")
  cmp(0, 7, "cmp2")
  cmp(0, 14, "cmp3")
  cmp(0, 21, "cmp4")

  mux(4, 4, "mux1")
  mux(4, 11, "mux2")
  mux(4, 18, "mux3")
  mux(4, 25, "mux4")

  draw.anchor("in0", (rel: (-2, 0), to: "cmp1-port-b"))
  draw.anchor("in1", (rel: (-6, 0), to: "mux1-port-in0"))
  draw.anchor("in2", (rel: (-2, 0), to: "cmp2-port-b"))
  draw.anchor("in3", (rel: (-6, 0), to: "mux2-port-in0"))
  draw.anchor("in4", (rel: (-2, 0), to: "cmp3-port-b"))
  draw.anchor("in5", (rel: (-6, 0), to: "mux3-port-in0"))
  draw.anchor("in6", (rel: (-2, 0), to: "cmp4-port-b"))
  draw.anchor("in7", (rel: (-6, 0), to: "mux4-port-in0"))

  stub("in0", "west", name: $"in"_0$, length: 0)
  stub("in1", "west", name: $"in"_1$, length: 0)
  stub("in2", "west", name: $"in"_2$, length: 0)
  stub("in3", "west", name: $"in"_3$, length: 0)
  stub("in4", "west", name: $"in"_4$, length: 0)
  stub("in5", "west", name: $"in"_5$, length: 0)
  stub("in6", "west", name: $"in"_6$, length: 0)
  stub("in7", "west", name: $"in"_7$, length: 0)

  wire("in0-cmp1", ("in0", "cmp1-port-b"), style: "zigzag")
  wire("in1-cmp1", ("in1", "cmp1-port-a"), style: "zigzag")
  wire("in2-cmp2", ("in2", "cmp2-port-b"), style: "zigzag")
  wire("in3-cmp2", ("in3", "cmp2-port-a"), style: "zigzag")
  wire("in4-cmp3", ("in4", "cmp3-port-b"), style: "zigzag")
  wire("in5-cmp3", ("in5", "cmp3-port-a"), style: "zigzag")
  wire("in6-cmp4", ("in6", "cmp4-port-b"), style: "zigzag")
  wire("in7-cmp4", ("in7", "cmp4-port-a"), style: "zigzag")

  wire("in0-mux1", ("in0", "mux1-port-in1"), style: "zigzag", zigzag-ratio: 25%)
  wire("in1-mux1", ("in1", "mux1-port-in0"), style: "zigzag")
  wire("in2-mux2", ("in2", "mux2-port-in1"), style: "zigzag", zigzag-ratio: 25%)
  wire("in3-mux2", ("in3", "mux2-port-in0"), style: "zigzag")
  wire("in4-mux3", ("in4", "mux3-port-in1"), style: "zigzag", zigzag-ratio: 25%)
  wire("in5-mux3", ("in5", "mux3-port-in0"), style: "zigzag")
  wire("in6-mux4", ("in6", "mux4-port-in1"), style: "zigzag", zigzag-ratio: 25%)
  wire("in7-mux4", ("in7", "mux4-port-in0"), style: "zigzag")

  intersection("in0-mux1.zig")
  intersection("in1-cmp1.zig")
  intersection("in2-mux2.zig")
  intersection("in3-cmp2.zig")
  intersection("in4-mux3.zig")
  intersection("in5-cmp3.zig")
  intersection("in6-mux4.zig")
  intersection("in7-cmp4.zig")

  wire("cmp1-out", ("cmp1-port-gt", "mux1.south"), style: "dodge", dodge-y: 2)
  wire("cmp2-out", ("cmp2-port-gt", "mux2.south"), style: "dodge", dodge-y: 9)
  wire("cmp3-out", ("cmp3-port-gt", "mux3.south"), style: "dodge", dodge-y: 16)
  wire("cmp4-out", ("cmp4-port-gt", "mux4.south"), style: "dodge", dodge-y: 23)
  intersection("cmp1-out.dodge-end")
  intersection("cmp2-out.dodge-end")
  intersection("cmp3-out.dodge-end")
  intersection("cmp4-out.dodge-end")

  cmp(7, 5, "cmp5")
  mux(11, 2, "mux5")
  mux(11, 9, "mux6")
  wire("mux1-cmp5", ("mux1-port-out", "cmp5-port-b"), style: "zigzag", zigzag-ratio: 80%)
  wire("mux2-cmp5", ("mux2-port-out", "cmp5-port-a"), style: "zigzag", zigzag-ratio: 80%)
  wire("cmp5-mux5", ("cmp5-port-gt", "mux5.north"), style: "dodge", dodge-y: 7)
  wire("cmp5-mux6", ("cmp5-port-gt", "mux6.south"), style: "dodge", dodge-y: 7)
  wire("mux2-mux6", ("mux2-port-out", "mux6-port-in0"), style: "zigzag")
  wire("mux1-mux6", ("mux1-port-out", "mux6-port-in1"), style: "zigzag", zigzag-ratio: 15%)
  wire("cmp1-mux5", ("cmp1-port-gt", "mux5-port-in1"), style: "zigzag")
  wire("cmp2-mux5", ("cmp2-port-gt", "mux5-port-in0"), style: "zigzag", zigzag-ratio: 37%)

  intersection("mux2-cmp5.zig")
  intersection("mux1-mux6.zig")
  intersection("cmp5-mux6.dodge-end")

  cmp(7, 19, "cmp6")
  mux(11, 16, "mux7")
  mux(11, 23, "mux8")
  wire("mux3-cmp6", ("mux3-port-out", "cmp6-port-b"), style: "zigzag", zigzag-ratio: 80%)
  wire("mux4-cmp6", ("mux4-port-out", "cmp6-port-a"), style: "zigzag", zigzag-ratio: 80%)
  wire("cmp6-mux7", ("cmp6-port-gt", "mux7.north"), style: "dodge", dodge-y: 21)
  wire("cmp6-mux8", ("cmp6-port-gt", "mux8.south"), style: "dodge", dodge-y: 21)
  wire("mux4-mux8", ("mux4-port-out", "mux8-port-in0"), style: "zigzag")
  wire("mux3-mux8", ("mux3-port-out", "mux8-port-in1"), style: "zigzag", zigzag-ratio: 15%)
  wire("cmp3-mux7", ("cmp3-port-gt", "mux7-port-in1"), style: "zigzag")
  wire("cmp4-mux7", ("cmp4-port-gt", "mux7-port-in0"), style: "zigzag", zigzag-ratio: 37%)

  intersection("mux4-cmp6.zig")
  intersection("mux3-mux8.zig")
  intersection("cmp6-mux8.dodge-end")

  cmp(14, 12, "cmp7")
  mux(18, 9, "mux9")
  mux(18, 16, "mux10")

  wire("mux6-cmp7", ("mux6-port-out", "cmp7-port-b"), style: "zigzag", zigzag-ratio: 80%)
  wire("mux8-cmp7", ("mux8-port-out", "cmp7-port-a"), style: "zigzag", zigzag-ratio: 80%)
  wire("cmp7-mux9", ("cmp7-port-gt", "mux9.north"), style: "dodge", dodge-y: 14)
  stub("cmp7-port-gt", "east", name: $"out"_2$, length: 3)

  wire("cmp5-mux9", ("cmp5-port-gt", "mux9-port-in1"), style: "zigzag", zigzag-ratio: 42%)
  wire("cmp6-mux9", ("cmp6-port-gt", "mux9-port-in0"), style: "zigzag", zigzag-ratio: 42%)
  stub("mux9-port-out", "east", name: $"out"_1$, length: 0.5)

  wire("mux5-mux10", ("mux5-port-out", "mux10-port-in1"), style: "zigzag", zigzag-ratio: 90%)
  wire("mux7-mux10", ("mux7-port-out", "mux10-port-in0"), style: "zigzag", zigzag-ratio: 90%)
  wire("cmp7-mux10", ("cmp7-port-gt", "mux10.south"), style: "dodge", dodge-y: 14)
  stub("mux10-port-out", "east", name: $"out"_0$, length: 0.5)

  intersection("cmp7-mux9.dodge-end")
})

#expander("Demo Code")[
  ```typ
  #import "@preview/circuiteria:0.2.0"

  #let circuit(..args) = html.div(style: "overflow-x: auto", html.frame(circuiteria.circuit(..args)))

  #circuit({
    import circuiteria.element: *
    import circuiteria.wire: *
    let cmp(x, y, id) = block(
      x: x,
      y: y,
      w: 3,
      h: 4,
      id: id,
      name: rotate(270deg, reflow: true)[Magnitude \ Comparator],
      ports: (
        west: ((id: "a", name: "a"), (id: "b", name: "b")),
        east: ((id: "gt", name: "gt"),),
      ),
    )

    let mux(x, y, id) = multiplexer(
      x: x,
      y: y,
      w: 1.5,
      h: 2.5,
      entries: ($1$, $0$),
      name: rotate(270deg, reflow: true)[Mux],
      id: id,
    )

    cmp(0, 0, "cmp1")
    cmp(0, 7, "cmp2")
    cmp(0, 14, "cmp3")
    cmp(0, 21, "cmp4")

    mux(4, 4, "mux1")
    mux(4, 11, "mux2")
    mux(4, 18, "mux3")
    mux(4, 25, "mux4")

    draw.anchor("in0", (rel: (-2, 0), to: "cmp1-port-b"))
    draw.anchor("in1", (rel: (-6, 0), to: "mux1-port-in0"))
    draw.anchor("in2", (rel: (-2, 0), to: "cmp2-port-b"))
    draw.anchor("in3", (rel: (-6, 0), to: "mux2-port-in0"))
    draw.anchor("in4", (rel: (-2, 0), to: "cmp3-port-b"))
    draw.anchor("in5", (rel: (-6, 0), to: "mux3-port-in0"))
    draw.anchor("in6", (rel: (-2, 0), to: "cmp4-port-b"))
    draw.anchor("in7", (rel: (-6, 0), to: "mux4-port-in0"))

    stub("in0", "west", name: $"in"_0$, length: 0)
    stub("in1", "west", name: $"in"_1$, length: 0)
    stub("in2", "west", name: $"in"_2$, length: 0)
    stub("in3", "west", name: $"in"_3$, length: 0)
    stub("in4", "west", name: $"in"_4$, length: 0)
    stub("in5", "west", name: $"in"_5$, length: 0)
    stub("in6", "west", name: $"in"_6$, length: 0)
    stub("in7", "west", name: $"in"_7$, length: 0)

    wire("in0-cmp1", ("in0", "cmp1-port-b"), style: "zigzag")
    wire("in1-cmp1", ("in1", "cmp1-port-a"), style: "zigzag")
    wire("in2-cmp2", ("in2", "cmp2-port-b"), style: "zigzag")
    wire("in3-cmp2", ("in3", "cmp2-port-a"), style: "zigzag")
    wire("in4-cmp3", ("in4", "cmp3-port-b"), style: "zigzag")
    wire("in5-cmp3", ("in5", "cmp3-port-a"), style: "zigzag")
    wire("in6-cmp4", ("in6", "cmp4-port-b"), style: "zigzag")
    wire("in7-cmp4", ("in7", "cmp4-port-a"), style: "zigzag")

    wire("in0-mux1", ("in0", "mux1-port-in1"), style: "zigzag", zigzag-ratio: 25%)
    wire("in1-mux1", ("in1", "mux1-port-in0"), style: "zigzag")
    wire("in2-mux2", ("in2", "mux2-port-in1"), style: "zigzag", zigzag-ratio: 25%)
    wire("in3-mux2", ("in3", "mux2-port-in0"), style: "zigzag")
    wire("in4-mux3", ("in4", "mux3-port-in1"), style: "zigzag", zigzag-ratio: 25%)
    wire("in5-mux3", ("in5", "mux3-port-in0"), style: "zigzag")
    wire("in6-mux4", ("in6", "mux4-port-in1"), style: "zigzag", zigzag-ratio: 25%)
    wire("in7-mux4", ("in7", "mux4-port-in0"), style: "zigzag")

    intersection("in0-mux1.zig")
    intersection("in1-cmp1.zig")
    intersection("in2-mux2.zig")
    intersection("in3-cmp2.zig")
    intersection("in4-mux3.zig")
    intersection("in5-cmp3.zig")
    intersection("in6-mux4.zig")
    intersection("in7-cmp4.zig")

    wire("cmp1-out", ("cmp1-port-gt", "mux1.south"), style: "dodge", dodge-y: 2)
    wire("cmp2-out", ("cmp2-port-gt", "mux2.south"), style: "dodge", dodge-y: 9)
    wire("cmp3-out", ("cmp3-port-gt", "mux3.south"), style: "dodge", dodge-y: 16)
    wire("cmp4-out", ("cmp4-port-gt", "mux4.south"), style: "dodge", dodge-y: 23)
    intersection("cmp1-out.dodge-end")
    intersection("cmp2-out.dodge-end")
    intersection("cmp3-out.dodge-end")
    intersection("cmp4-out.dodge-end")

    cmp(7, 5, "cmp5")
    mux(11, 2, "mux5")
    mux(11, 9, "mux6")
    wire("mux1-cmp5", ("mux1-port-out", "cmp5-port-b"), style: "zigzag", zigzag-ratio: 80%)
    wire("mux2-cmp5", ("mux2-port-out", "cmp5-port-a"), style: "zigzag", zigzag-ratio: 80%)
    wire("cmp5-mux5", ("cmp5-port-gt", "mux5.north"), style: "dodge", dodge-y: 7)
    wire("cmp5-mux6", ("cmp5-port-gt", "mux6.south"), style: "dodge", dodge-y: 7)
    wire("mux2-mux6", ("mux2-port-out", "mux6-port-in0"), style: "zigzag")
    wire("mux1-mux6", ("mux1-port-out", "mux6-port-in1"), style: "zigzag", zigzag-ratio: 15%)
    wire("cmp1-mux5", ("cmp1-port-gt", "mux5-port-in1"), style: "zigzag")
    wire("cmp2-mux5", ("cmp2-port-gt", "mux5-port-in0"), style: "zigzag", zigzag-ratio: 37%)

    intersection("mux2-cmp5.zig")
    intersection("mux1-mux6.zig")
    intersection("cmp5-mux6.dodge-end")

    cmp(7, 19, "cmp6")
    mux(11, 16, "mux7")
    mux(11, 23, "mux8")
    wire("mux3-cmp6", ("mux3-port-out", "cmp6-port-b"), style: "zigzag", zigzag-ratio: 80%)
    wire("mux4-cmp6", ("mux4-port-out", "cmp6-port-a"), style: "zigzag", zigzag-ratio: 80%)
    wire("cmp6-mux7", ("cmp6-port-gt", "mux7.north"), style: "dodge", dodge-y: 21)
    wire("cmp6-mux8", ("cmp6-port-gt", "mux8.south"), style: "dodge", dodge-y: 21)
    wire("mux4-mux8", ("mux4-port-out", "mux8-port-in0"), style: "zigzag")
    wire("mux3-mux8", ("mux3-port-out", "mux8-port-in1"), style: "zigzag", zigzag-ratio: 15%)
    wire("cmp3-mux7", ("cmp3-port-gt", "mux7-port-in1"), style: "zigzag")
    wire("cmp4-mux7", ("cmp4-port-gt", "mux7-port-in0"), style: "zigzag", zigzag-ratio: 37%)

    intersection("mux4-cmp6.zig")
    intersection("mux3-mux8.zig")
    intersection("cmp6-mux8.dodge-end")

    cmp(14, 12, "cmp7")
    mux(18, 9, "mux9")
    mux(18, 16, "mux10")

    wire("mux6-cmp7", ("mux6-port-out", "cmp7-port-b"), style: "zigzag", zigzag-ratio: 80%)
    wire("mux8-cmp7", ("mux8-port-out", "cmp7-port-a"), style: "zigzag", zigzag-ratio: 80%)
    wire("cmp7-mux9", ("cmp7-port-gt", "mux9.north"), style: "dodge", dodge-y: 14)
    stub("cmp7-port-gt", "east", name: $"out"_2$, length: 3)

    wire("cmp5-mux9", ("cmp5-port-gt", "mux9-port-in1"), style: "zigzag", zigzag-ratio: 42%)
    wire("cmp6-mux9", ("cmp6-port-gt", "mux9-port-in0"), style: "zigzag", zigzag-ratio: 42%)
    stub("mux9-port-out", "east", name: $"out"_1$, length: 0.5)

    wire("mux5-mux10", ("mux5-port-out", "mux10-port-in1"), style: "zigzag", zigzag-ratio: 90%)
    wire("mux7-mux10", ("mux7-port-out", "mux10-port-in0"), style: "zigzag", zigzag-ratio: 90%)
    wire("cmp7-mux10", ("cmp7-port-gt", "mux10.south"), style: "dodge", dodge-y: 14)
    stub("mux10-port-out", "east", name: $"out"_0$, length: 0.5)

    intersection("cmp7-mux9.dodge-end")
  })
  ```
]
