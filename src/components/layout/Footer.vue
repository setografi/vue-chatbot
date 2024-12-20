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
  padding: 1rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;

  &__link {
    color: var(--text-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
