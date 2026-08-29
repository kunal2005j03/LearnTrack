const h = new Headers();
h.append('Authorization', 'Bearer token123');
h.forEach((value, key) => {
  console.log(`Key: ${key}, Value: ${value}`);
});
