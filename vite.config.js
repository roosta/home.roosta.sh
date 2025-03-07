import handlebars from "vite-plugin-handlebars";
import { resolve } from 'path';

export default {
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'partials'),
    })
  ]
};
