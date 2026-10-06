// Packs build/ into package/<name>-<version>.zip for the Chrome Web Store.
import gulp from 'gulp'
import zip from 'gulp-zip'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('build/manifest.json', 'utf8'))

gulp
  .src('build/**', { encoding: false })
  .pipe(zip(`${manifest.name.replaceAll(' ', '-')}-${manifest.version}.zip`))
  .pipe(gulp.dest('package'))
