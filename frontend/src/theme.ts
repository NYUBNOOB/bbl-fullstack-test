import { createTheme } from "@mui/material/styles";

const customFont =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  typography: {
    fontFamily: customFont,
    h1: {
      fontFamily: customFont,
      fontWeight: 700,
    },
    h2: {
      fontFamily: customFont,
      fontWeight: 700,
    },
    h3: {
      fontFamily: customFont,
      fontWeight: 600,
    },
    h4: {
      fontFamily: customFont,
      fontWeight: 600,
    },
    h5: {
      fontFamily: customFont,
      fontWeight: 600,
    },
    h6: {
      fontFamily: customFont,
      fontWeight: 600,
    },
    body1: {
      fontFamily: customFont,
    },
    body2: {
      fontFamily: customFont,
    },
    button: {
      fontFamily: customFont,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: customFont,
        },
        "html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video":
          {
            fontFamily: customFont,
          },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          fontFamily: customFont,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: customFont,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontFamily: customFont,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          fontFamily: customFont,
        },
      },
    },
  },
});
