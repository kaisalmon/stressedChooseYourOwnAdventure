function autorun()
{
  alert("Compiled")
}
if (document.addEventListener) document.addEventListener("DOMContentLoaded", autorun, false);
else window.onload = autorun;
