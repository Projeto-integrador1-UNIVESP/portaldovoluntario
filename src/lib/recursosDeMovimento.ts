/**
 * Recursos do `LazyMotion`, num módulo só deles.
 *
 * O `App` carrega este arquivo com `import()` dinâmico. Se fizesse
 * `import("motion/react").then((m) => m.domMax)`, o bundler precisaria do
 * namespace inteiro da biblioteca, e o `motion` completo (motion.div e cia.)
 * voltava para o chunk inicial: o chunk dobrava de tamanho.
 */
export { domMax as default } from "motion/react";
