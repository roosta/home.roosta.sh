![home screenshot](https://raw.githubusercontent.com/roosta/assets/master/roosta.sh/home.png "home screenshot")

Landing page for roosta.sh

## Installation

Clone this repository and run `npm install`
```shell
# https
git clone https://github.com/roosta/home.roosta.sh
# or using ssh
git clone git@github.com:roosta/home.roosta.sh.git

cd home.roosta.sh && npm install
```
## Development

To start a server that will host a live reload serve of the page:

```
npm run serve
```

The [config](webpack.config.js) will try to open `google-chrome-unstable` with
a forced device scale factor due to my personal screen setup, and will webpack
warn about this. Can be ignored, or changed.

Either way you can point your browser to [localhost:8080](http://localhost:8080)

## Deployment

Included in the repo is a [Dockerfile](Dockerfile), you could use that to
deploy the app with nginx. I personally use Dockerfiles and dokku setup on a
digital ocean droplet, but you can just run
```sh
npm run build
```

or

```
yarn build
```

to have the website compiled to the `./dist` folder, then deploy however you
like.

## Text art

I made the artwork using [moebius](https://github.com/blocktronics/moebius), a
fantastic modern ANSI & ASCII art editor.

This editor features an utf8 export option, that can be used to output to modern
character sets. You can also do that conversion using something like [recode](https://github.com/rrthomas/recode):

```shell
recode 437 < input.ans > output.utf8ans
```

To convert this to HTML I used [ansi2html](https://github.com/pycontribs/ansi2html):

```shell
ansi2html < input.utf8ans > output.html
```

I used black and white only when drawing, which resulted in a pretty clean
html export, but your mileage may vary.

## License

Copyright (c) 2022 Daniel Berg

Source code distributed under [GNU General Public License v3.0](LICENSE) or later.

