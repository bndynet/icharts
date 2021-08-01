import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import scss from 'rollup-plugin-scss'

const pkg = require('./package.json');
const libName = pkg.name.indexOf('/') > 0 ? pkg.name.split('/')[1].toLocaleLowerCase() : pkg.name.toLocaleLowerCase();

export default {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    file: pkg.main,
    name: libName,
    sourcemap: true,
  },
  plugins: [
    scss({fileName: `${libName}.css`, outputStyle: 'compressed'}),
    resolve(),
    commonjs({
      include: ['node_modules/**'],
    }),
    typescript(),
    replace({
      preventAssignment: true,  // fix warning as next major version default this option to `true`
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    terser(),
  ]
};