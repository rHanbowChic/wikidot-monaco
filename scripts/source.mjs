// Packs the sources needed to rebuild the extension into package/<name>-<version>-source.zip,
// which AMO requires alongside the bundled Firefox build.
import gulp from 'gulp'
import zip from 'gulp-zip'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

gulp
  .src(
    [
      'src/**',
      'public/**',
      'scripts/**',
      'options.html',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'README.md',
      'LICENSE',
    ],
    { base: '.', encoding: false },
  )
  .pipe(zip(`${pkg.name}-${pkg.version}-source.zip`))
  .pipe(gulp.dest('package'))
