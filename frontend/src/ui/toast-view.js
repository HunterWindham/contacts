export function showToast(elements, message, variant = "success") {
  const palette = {
    success: "bg-emerald-600",
    error: "bg-rose-600",
  };
  const node = document.createElement("div");
  node.className = `pointer-events-auto mt-2 rounded-xl ${palette[variant] ?? palette.success} px-4 py-2 text-sm text-white shadow-lg`;
  node.style.opacity = "0";
  node.style.transform = "translateY(-4px)";
  node.textContent = message;
  elements.toast.appendChild(node);

  // Force reflow so the transition kicks in.
  void node.offsetWidth;
  node.style.opacity = "1";
  node.style.transform = "translateY(0)";

  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(-4px)";
    setTimeout(() => node.remove(), 250);
  }, 2200);
}
