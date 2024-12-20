<template>
  <footer class="footer">
    <p>
      Made by <a href="#" class="footer__link">Setografi</a> |
      <a href="#" class="footer__link">Github</a>
    </p>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  text-align: start;
  padding: 0.25rem 0rem 1rem 0rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-sm);

  &__link {
    color: var(--text-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
