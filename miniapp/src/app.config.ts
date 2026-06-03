export default defineAppConfig({
  pages: [
    'pages/styles/index',
    'pages/prompts/index',
    'pages/image/index',
    'pages/profile/index',
    'pages/index/index',
    'pages/login/index',
    'pages/assets/index',
    'pages/asset-library/index',
    'pages/config/index',
  ],
  tabBar: {
    color: '#a8a29e',
    selectedColor: '#fafaf9',
    backgroundColor: '#0c0a09',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/styles/index',
        text: '风格库',
        iconPath: 'assets/tabbar/styles-normal.png',
        selectedIconPath: 'assets/tabbar/styles-selected.png',
      },
      {
        pagePath: 'pages/prompts/index',
        text: '提示词库',
        iconPath: 'assets/tabbar/prompts-normal.png',
        selectedIconPath: 'assets/tabbar/prompts-selected.png',
      },
      {
        pagePath: 'pages/image/index',
        text: '生图工作台',
        iconPath: 'assets/tabbar/image-normal.png',
        selectedIconPath: 'assets/tabbar/image-selected.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '个人中心',
        iconPath: 'assets/tabbar/profile-normal.png',
        selectedIconPath: 'assets/tabbar/profile-selected.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '无限画布',
    navigationBarTextStyle: 'black',
  },
})
