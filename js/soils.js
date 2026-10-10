/* ------------------------------------------------------------------
   SOIL DATA: the profile drawings on every page are built from this.

   To add your soil, fill in one of the empty entries below:
     series    your soil series name, e.g. "Wauseon"
     member    your name
     subgroup  e.g. "Typic Epiaquolls"
     horizons  one line per horizon, top to bottom.
               top / bottom are depths in centimetres.
               color is a screen approximation of the moist Munsell
               colour (search "Munsell to hex" for a converter).
   Leave horizons as [] until you have them and the page will show
   an empty core instead.
------------------------------------------------------------------- */
window.SOILS = [
  {
    id: "wauseon",
    page: "wauseon.html",
    series: "Wauseon",
    member: "Andy Guelcher",
    subgroup: "Typic Epiaquolls",
    horizons: [
      { name: "Ap",  top: 0,   bottom: 23,  munsell: "10YR 2/1", color: "#37312c" },
      { name: "A",   top: 23,  bottom: 33,  munsell: "10YR 2/1", color: "#3b342e" },
      { name: "Bg1", top: 33,  bottom: 53,  munsell: "10YR 4/1", color: "#6b635b" },
      { name: "Bg2", top: 53,  bottom: 71,  munsell: "10YR 4/1", color: "#6f675e" },
      { name: "Bg3", top: 71,  bottom: 81,  munsell: "10YR 4/1", color: "#6a6259" },
      { name: "2BC", top: 81,  bottom: 91,  munsell: "10YR 4/4", color: "#7a5f37" },
      { name: "2C",  top: 91,  bottom: 147, munsell: "10YR 4/3", color: "#746042" },
      { name: "2Cd", top: 147, bottom: 203, munsell: "10YR 4/3", color: "#6d5a3e" }
    ]
  },
  {
    id: "soil-2",
    page: "soil-2.html",
    series: "",
    member: "",
    subgroup: "",
    horizons: []
  },
  {
    id: "soil-3",
    page: "soil-3.html",
    series: "",
    member: "",
    subgroup: "",
    horizons: []
  }
];
