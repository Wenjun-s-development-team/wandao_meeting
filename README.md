# draw-ts

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Project Setup

### Install

```bash
$ yarn
```

```bash
$ yarn dev
```

### Build

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```

## Link

[electron-vite 是一个electron + vite 新型构建工具](https://cn.electron-vite.org/guide/)

Vue项目核心成员之一 [Anthony Fu](https://antfu.me/)

CSS 元子化 [UnoCSS主页](https://unocss.dev/)、[重新构想原子化 CSS](https://antfu.me/posts/reimagine-atomic-css-zh)、 [实现 UnoCSS 自动补全](https://www.bilibili.com/video/BV1y3411W7YG/?spm_id_from=333.999.0.0&vd_source=8d8b9daa275ea2eb92a1c4b9a802af8c)、[interactive docs](https://unocss.dev/interactive/)

开源图标组件 [@iconify/json](<[@iconify/json](https://iconify.design/)>)、 全部图标[icones](https://icones.js.org/)

自动注册组件 [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)

自动导入 [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import)

- 关于 eslint：[为什么我不使用 Prettier](https://antfu.me/posts/why-not-prettier-zh)、[替代方案 eslint-config](https://github.com/antfu/eslint-config)

- 一个小欢乐：[我看你Vue写的挺好的，10K五险一金考虑一下 | 不吃盒饭15K可以吗 【程序员模拟面试antfu】](https://www.bilibili.com/video/BV1TY4y1p783/?spm_id_from=333.999.0.0&vd_source=8d8b9daa275ea2eb92a1c4b9a802af8c)

## 关于一些比较方便的工具

> @/utils/node
> openNodeEditor(nodeId) 传入nodeId，打开Node的弹窗
> openNodeNew() 打开新建Node的弹窗

> @/utils
> getParams(key) 传入想要获取参数的key 解析得到Params （吐槽一下，url有问题，用原生解析不了，我就封装了一层
> getBaseURL 在上面更封装了一下，LL

## 节点移入另一个节点

```js
// 设被移动节点=A, 目标节点为=B
// o前缀表示旧的值

// 先确定 A.startTime
if(A.oStartTime >= B.startTime){
  A.startTime = A.oStartTime
} else if(A.oStartTime < B.startTime){
  A.startTime = B.startTime
}

// 计算A.offsetX
A.offsetX = A.startTime - A.oStartTime
// 计算A.endTime
A.endTime += A.offsetX
// 递归更新A的子子孙孙的 X
function updateChildren(children) {
  children?.map(item => {
    item.startTime += A.offsetX
    item.endTime += A.offsetX
    if(item.children?.length){
      updateChildren(item.children)
    }
  })
}
updateChildren(A.children)

// 撑开B
if(B.endTime < A.endTime){
  B.endTime = A.endTime
  // B的所有父
  B.parentArray?.map(item => {
    if(item.endTime < A.endTime){
      item.endTime = A.endTime
    }
  })
}

// A.ganttY
const ganttY = B.children?.reduce((maxY, item) => {
  const ganttHY = item.ganttY + item.ganttH
  return ganttHY > maxY ? ganttHY : maxY
}, 0)

A.ganttY = ganttY + 1

// 或者
A.ganttY = B.ganttY + B.ganttH
```

## 节点位移限制

- nodeUpdate 接口 type='move' 时
- 设当前移动的节点为A

```js
const leftNode = 'SELECT * FROM node WHERE pid=A.pid AND endTime < A.startTime'
const rightNode = 'SELECT * FROM node WHERE pid=A.pid AND startTime > A.endTime'
if(A.flag === 1){
  // 如果移动的是前置节点
  if(moveX < 0 ){
    // 向左推开兄弟，撑开或不撑开父
  } else if(moveX > 0){
    // 向右推开兄弟，撑开或不撑开父
  }
  // 其它之前的逻辑处理
} else {
  // 如果移动的不是前置节点
  if(moveX < 0 ){
    // 向左时
    let startTime = A.startTime + moveX // 时间加减
    // 筛选出左边flag=1的兄弟
    const leftMaxtime = Math.max(...leftNode.filter(item => item.flag===1).map(item => new Date(item.endTime)))
    if(new Date(startTime) < leftMaxtime){
      moveX = leftMaxtime - startTime // 重新计算位移量
      startTime = A.startTime + moveX
      endTime = A.endTime + moveX
    }
  } else if(moveX > 0 ){
    // 向右时
    let endTime = A.endTime + moveX // 时间加减
    // 筛选出右边flag=1的兄弟
    const rightMintime = Math.min(...rightNode.filter(item => item.flag===1).map(item => new Date(item.startTime)))
    if(new Date(endTime) > rightMintime){
      moveX = rightMintime - endTime // 重新计算位移量
      startTime = A.startTime + moveX
      endTime = A.endTime + moveX
    }
  }
  // Db.exec('UPDATE SET startTime=?, endTime=? WHERE id=A.id', startTime, endTime)
}
```
