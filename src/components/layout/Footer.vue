<template>
  <footer class="footer">
    <p>Made by <a href="https://github.com/setografi" class="footer__link">Setografi</a></p>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  text-align: end;
  font-weight: 600;
  padding: 1rem 1rem 1rem 1rem;
  color: var(--text-color);
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
