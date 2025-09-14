<template>
  <div>
    <h2>Good evening, <i>Seto</i></h2>
    <div class="card big">
      <h3>Download your Pi conversation history</h3>
      <p>Manage history</p>
    </div>
    <div class="grid">
      <div class="card">Relationship advice</div>
      <div class="card">Let me translate something</div>
      <div class="card">Let Pi pick your DJ</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.big {
  background: #f0ebe1;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
</style>
