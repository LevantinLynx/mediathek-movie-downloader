Vue.component('ImageIntersectionFadeInBluredBg', {
  inheritAttrs: false,
  props: {
    src: {
      type: String,
      required: true
    },
    alt: String
  },
  data() {
    return {
      loaded: false
    }
  },
  methods: {
    onLoaded() {
      this.loaded = true;
    }
  },
  mounted() {
    const { src, srcset, $el } = this
    const observer = new IntersectionObserver(([entry]) => {
      const img = $el.querySelector(`.lazyImg`)
      const bg = $el.querySelector(`.lazyBg`)

      if (entry.isIntersecting) {
        // Element is in viewport
        if (!!srcset) img.srcset = srcset
        img.src = src
        bg.src = src
        observer.disconnect()
      }
    })
    observer.observe($el)

    this.$once("hook:beforeDestroy", () => {
      observer.disconnect()
    })
  },
  template: `
    <div style="height: 100%;">
      <transition name="fade">
        <div class="imgWrapper" v-show="loaded">
          <img src="" class="lazyBg">
          <img src="" :alt="$attrs.alt || ''" v-bind="$attrs" @load="onLoaded" class="lazyImg">
        </div>
      </transition>
    </div>`
})