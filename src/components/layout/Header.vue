<template>
  <header class="header">
    <div class="header__logo">
      <img src="../../assets/logo.svg" alt="Bot Icon" />
      <div class="header__logo__title">
        <h1>MIRA</h1>
        <span>“Mindful Interactive Relaxed Ally”</span>
      </div>
    </div>
    <!-- <div class="header__subtitle">Based on Openai/GPT.</div> -->
  </header>
</template>

<style scoped lang="scss">
.header {
  position: absolute;
  text-align: start;
  padding: 1rem 1rem 1rem 1rem;
  z-index: 20;

  &__logo {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    gap: 1rem;
    // margin-bottom: 2rem;

    img {
      width: 40px;
      height: 40px;
    }

    &__title {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;

      h1 {
        font-size: var(--font-size-3xl);
        color: var(--text-color);
      }

      span {
        color: var(--accent-color);
      }
    }
  }

  // &__subtitle {
  //   color: var(--text-color);
  //   font-size: var(--font-size-base);
  // }
}
</style>
