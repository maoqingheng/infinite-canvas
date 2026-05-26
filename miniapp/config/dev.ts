import type { UserConfigExport } from "@tarojs/cli"

export default {

  mini: {},
  h5: {
    devServer: {
      port: 3001,
    },
  }
} satisfies UserConfigExport<'vite'>
