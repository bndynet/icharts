<template>
  <el-divider content-position="left">
    <el-text type="info" size="small" class="section-label">
      <slot />
    </el-text>
    <slot name="extra" />
  </el-divider>
</template>

<style scoped>
.section-label {
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
