<svelte:options customElement={{
  tag: 'svelte-component',
  shadow: 'open',
  props: {
    name: {
      reflect: true,
      type: 'String'
    }
  }
}} />

<script>
  let { name = 'Svelte' } = $props();
</script>

<h1>Hello from {name}!</h1>
