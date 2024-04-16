let customRatio = true

// aspect       0      1      2      3       4
const ratios = ['0:0', '4:3', '16:9', '1:1', '1:2']
let aspect = 2

let ratio = getAspectRatio()

function getEcN(className) {
  return document.getElementsByClassName(className)
}

function getId(id) {
  return document.getElementById(id)
}

/**
 * Get aspect ratio
 * @returns {integer} aspect ratio
 */
function getAspectRatio() {
  customRatio = aspect === 0
  const ratio = ratios[aspect].split(':')
  return Number.parseInt(ratio[1]) / Number.parseInt(ratio[0])
}

/**
 * Calculate area
 * @param {integer} Increment
 * @param {integer} Count
 * @param {integer} Width
 * @param {integer} Height
 * @param {integer} Margin
 * @returns
 */
function Area(Increment, Count, Width, Height, Margin = 10) {
  ratio = customRatio ? 0.75 : ratio
  let i = 0
  let w = 0
  let h = Increment * ratio + Margin * 2
  while (i < Count) {
    if (w + Increment > Width) {
      w = 0
      h = h + Increment * ratio + Margin * 2
    }
    w = w + Increment + Margin * 2
    i++
  }
  if (h > Height) {
    return false
  } else {
    return Increment
  }
}

function getSlALL(selector) {
  return document.querySelectorAll(selector)
}

export function setSP(key, value) {
  return document.documentElement.style.setProperty(key, value)
}

const isHideMeActive = false
const isMobileDevice = false
/**
 * Resize video elements
 */
function resizeVideoMedia() {
  const videoMediaContainer = getId('videoMediaContainer')
  const Cameras = getEcN('Camera')

  const Margin = 5
  let Width = videoMediaContainer!.offsetWidth - Margin * 2
  const Height = videoMediaContainer!.offsetHeight - Margin * 2
  let max = 0
  const optional = isHideMeActive && videoMediaContainer!.childElementCount <= 2 ? 1 : 0
  const isOneVideoElement = videoMediaContainer!.childElementCount - optional === 1

  // console.log('videoMediaContainer.childElementCount:', {
  //     isOneVideoElement: isOneVideoElement,
  //     children: videoMediaContainer.childElementCount,
  //     optional: optional,
  // });

  resetZoom() // ...

  const bigWidth = Width * 4
  if (isOneVideoElement) {
    Width = Width - bigWidth
  }

  // loop (i recommend you optimize this)
  let i = 1
  while (i < 5000) {
    const w = Area(i, Cameras.length, Width, Height, Margin)
    if (w === false) {
      max = i - 1
      break
    }
    i++
  }

  max = max - Margin * 2
  setWidth(Cameras, max, bigWidth, Margin, Height, isOneVideoElement)
  setSP('--vmi-wh', `${max / 3}px`)
}

/**
 * Reset zoom to avoid incorrect UI on screen resize
 */
function resetZoom() {
  const videoElements = getSlALL('video')
  videoElements.forEach((video) => {
    video.style.transform = ''
    video.style.transformOrigin = 'center'
  })
}

/**
 * Set Width
 * @param {object} Cameras
 * @param {integer} width
 * @param {integer} bigWidth
 * @param {integer} margin
 * @param {integer} maxHeight
 * @param {boolean} isOneVideoElement
 */
function setWidth(Cameras, width, bigWidth, margin, maxHeight, isOneVideoElement) {
  ratio = customRatio ? 0.68 : ratio
  for (let s = 0; s < Cameras.length; s++) {
    Cameras[s].style.width = `${width}px`
    Cameras[s].style.margin = `${margin}px`
    Cameras[s].style.height = `${width * ratio}px`
    if (isOneVideoElement) {
      Cameras[s].style.width = `${bigWidth}px`
      Cameras[s].style.height = `${bigWidth * ratio}px`
      const camHeigh = Cameras[s].style.height.substring(0, Cameras[s].style.height.length - 2)
      if (camHeigh >= maxHeight) {
        Cameras[s].style.height = `${maxHeight - 2}px`
      }
    }
  }
}
const mainButtonsBar = true
const btnsBarSelect = { selectedIndex: 0 }
const mainButtonsIcon = ''
/**
 * Handle main buttons size (responsive)
 */
function resizeMainButtons() {
  if (!mainButtonsBar) {
    return
  }
  // Devices break point
  const MOBILE_BREAKPOINT = 500
  const TABLET_BREAKPOINT = 580
  const DESKTOP_BREAKPOINT = 730
  // Devices width x height
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  // console.log('Window size', { width: windowWidth, height: windowWidth});

  // Determine whether buttons bar is vertical or horizontal
  const isButtonsBarVertical = btnsBarSelect.selectedIndex === 0

  if (isButtonsBarVertical) {
    // Main buttons vertical align
    if (windowHeight <= MOBILE_BREAKPOINT) {
      setStyles(mainButtonsBar, '0.8rem', '2px', mainButtonsIcon, '0.8rem', '25px')
    } else if (windowHeight <= TABLET_BREAKPOINT) {
      setStyles(mainButtonsBar, '1rem', '3px', mainButtonsIcon, '1rem', '30px')
    } else if (windowHeight <= DESKTOP_BREAKPOINT) {
      setStyles(mainButtonsBar, '1.2rem', '4px', mainButtonsIcon, '1rem', '35px')
    } else {
      // > DESKTOP_BREAKPOINT
      setStyles(mainButtonsBar, '1.5rem', '4px', mainButtonsIcon, '1.2rem', '40px')
    }
  } else {
    // Main buttons horizontal align
    if (windowWidth <= MOBILE_BREAKPOINT) {
      setStyles(mainButtonsBar, '0.8rem', '2px', mainButtonsIcon, '0.8rem')
    } else if (windowWidth <= TABLET_BREAKPOINT) {
      setStyles(mainButtonsBar, '1rem', '3px', mainButtonsIcon, '1rem')
    } else if (windowWidth <= DESKTOP_BREAKPOINT) {
      setStyles(mainButtonsBar, '1.2rem', '4px', mainButtonsIcon, '1rem')
    } else {
      // > DESKTOP_BREAKPOINT
      setStyles(mainButtonsBar, '1.5rem', '4px', mainButtonsIcon, '1.2rem')
    }
  }
  /**
   * Set styles based on orientation
   * @param {object} elements
   * @param {string} fontSize
   * @param {string} padding
   * @param {object} icons
   * @param {string} fontSizeIcon
   * @param {string} bWidth
   */
  function setStyles(elements, fontSize, padding, icons, fontSizeIcon, bWidth: null | string = null) {
    if (bWidth) {
      document.documentElement.style.setProperty('--btns-width', bWidth)
    }

    elements.forEach((element) => {
      element.style.fontSize = fontSize
      element.style.padding = padding
    })
    icons.forEach((icon) => {
      icon.style.fontSize = fontSizeIcon
    })
  }
}

/**
 * Handle window event listener
 */
window.addEventListener('load', () => {
  resizeVideoMedia()
  resizeMainButtons()
  window.onresize = function () {
    resizeVideoMedia()
    resizeMainButtons()
  }
}, false)

/**
 * Set aspect ratio
 * @param {integer} index ratios index
 */
export function setAspectRatio(index) {
  aspect = index
  ratio = getAspectRatio()
  resizeVideoMedia()
}

export function adaptAspectRatio() {
  const participantsCount: number = 0
  // const participantsCount = videoMediaContainer.childElementCount
  // if (this.peersCount) {
  //   this.peersCount.innerText = participantsCount
  // }
  let desktop: number = 0
  let mobile: number = 1

  // desktop aspect ratio
  switch (participantsCount) {
    case 1:
    case 3:
    case 4:
    case 7:
    case 9:
      desktop = 2 // (16:9)
      break
    case 5:
    case 6:
    case 10:
    case 11:
      desktop = 1 // (4:3)
      break
    case 2:
    case 8:
      desktop = 3 // (1:1)
      break
    default:
      desktop = 0 // (0:0)
  }
  // mobile aspect ratio
  switch (participantsCount) {
    case 3:
    case 9:
    case 10:
      mobile = 2 // (16:9)
      break
    case 2:
    case 7:
    case 8:
    case 11:
      mobile = 1 // (4:3)
      break
    case 1:
    case 4:
    case 5:
    case 6:
      mobile = 3 // (1:1)
      break
    default:
      mobile = 3 // (1:1)
  }
  if (participantsCount > 11) {
    desktop = 1 // (4:3)
    mobile = 3 // (1:1)
  }
  setAspectRatio(isMobileDevice ? mobile : desktop)
}
