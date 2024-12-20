<template>
  <header class="header">
    <div class="header__logo">
      <img src="../../assets/logo.svg" alt="Bot Icon" />
      <h1>ChatAI <span>Demo</span></h1>
    </div>
    <div class="header__subtitle">Based on Llama3.</div>
  </header>
</template>

<style scoped lang="scss">
.header {
  text-align: start;
  padding: 1rem 0rem 0.25rem 0rem;

  &__logo {
    display: flex;
    flex-direction: column;
    align-items: start;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 0.5rem;

    img {
      width: 40px;
      height: 40px;
    }

    h1 {
      font-size: var(--font-size-3xl);

      span {
        color: var(--accent-color);
      }
    }
  }

  &__subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--font-size-base);
  }
}
</style>
