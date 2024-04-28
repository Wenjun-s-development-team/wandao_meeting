import { onBeforeUnmount, onMounted, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { addUnit } from '@/utils'

/**
 * 拖拽
 *
 * @export
 * @param {(Ref<HTMLElement | undefined>)} targetRef 目标元素
 * @param {(Ref<HTMLElement | undefined>)} dragRef 拖拽元素
 * @param {boolean} draggable 是否启用
 * @param {boolean} overflow 拖动范围是否可以超出可视区
 * @param {number} offsetTop 拖动范围 Top 限制量
 */
export function useDraggable(
  targetRef: Ref<HTMLElement | undefined>,
  dragRef: Ref<HTMLElement | undefined>,
  draggable: boolean,
  overflow: boolean = false,
  offsetTop: number = 0,
) {
  let transform = {
    offsetX: 0,
    offsetY: 0,
  }

  const dragKey = `draggable-${Date.now()}`

  const onMousedown = (e: MouseEvent) => {
    const downX = e.clientX
    const downY = e.clientY
    const { offsetX, offsetY } = transform

    const targetRect = targetRef.value!.getBoundingClientRect()
    const targetLeft = targetRect.left
    const targetTop = targetRect.top
    const targetWidth = targetRect.width
    const targetHeight = targetRect.height

    const clientWidth = document.documentElement.clientWidth
    const clientHeight = document.documentElement.clientHeight

    const minLeft = -targetLeft + offsetX
    const minTop = -targetTop + offsetY + offsetTop
    const maxLeft = clientWidth - targetLeft - targetWidth + offsetX
    const maxTop = clientHeight - targetTop - targetHeight + offsetY

    const onMousemove = (e: MouseEvent) => {
      let moveX = offsetX + e.clientX - downX
      let moveY = offsetY + e.clientY - downY

      if (!overflow) {
        moveX = Math.min(Math.max(moveX, minLeft), maxLeft)
        moveY = Math.min(Math.max(moveY, minTop), maxTop)
      }

      transform = {
        offsetX: moveX,
        offsetY: moveY,
      }

      if (targetRef.value) {
        targetRef.value.style.transform = `translate(${addUnit(moveX)}, ${addUnit(moveY)})`
      }
    }

    const onMouseup = () => {
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  }

  const onDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.classList.add(dragKey)
      dragRef.value.addEventListener('mousedown', onMousedown)
    }
  }

  const offDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.classList.remove(dragKey)
      dragRef.value.removeEventListener('mousedown', onMousedown)
    }
  }

  onMounted(() => {
    watchEffect(() => {
      if (draggable && dragRef.value) {
        onDraggable()
      } else {
        offDraggable()
      }
    })
  })

  onBeforeUnmount(() => {
    offDraggable()
  })
}
