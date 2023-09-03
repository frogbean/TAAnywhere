let isDragging = false
let offsetX, offsetY

const click = new Audio('click.mp3');

document.addEventListener('mousedown', (e) => {
  isDragging = true
  offsetX = e.clientX
  offsetY = e.clientY
})

document.addEventListener('mouseup', () => {
  isDragging = false
})

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const newX = e.screenX - offsetX
    const newY = e.screenY - offsetY

    window.electronAPI.dragWindow(newX, newY)
  }
})

window.addEventListener('load', ()=>{
  const terminalOutput = document.getElementById('terminalOutput')
  const terminal = document.getElementById('myTerminal')
  const select = document.querySelector('#matrixDropdown')
  const install = document.querySelector('#install')
  const githubClick = document.querySelector('#githubClick')

  githubClick.onclick = ()=>{
    click.play();
    electronAPI.github()
  }

  install.onclick = ()=> {
    if(electronAPI.locked()) return
    click.play();
    if(!install.className.includes("borderGlow")) return
    electronAPI.install(select.value)
    
  }

  select.oninput = ()=>{
    click.play();
    const mod = select.value;
    log(`mod selected: ${mod}`)
  }

  document.querySelector('.M').addEventListener("click", function() {
    click.play();
    electronAPI.minimize()
  })
  document.querySelector('.X').addEventListener("click", function() {
    electronAPI.close()
  })

  window.log = function(output) {
    terminalOutput.innerHTML += `${output}<br>`
    terminal.scrollTo(0, terminalOutput.scrollHeight);
  }

  window.error = function(output) {
    terminalOutput.innerHTML += `<span class="error">Error: ${output}<span><br>`
    terminal.scrollTo(0, terminalOutput.scrollHeight);
  }

  terminal.addEventListener('mousedown', (e) => {
    e.stopPropagation()
  })

  let t = 0;
  setInterval(()=>{
    for(const element of document.querySelectorAll('.borderGlow'))
      element.style.boxShadow = `0 0 5px rgba(0, 255, 0, ${Math.abs(1 * Math.sin(t))})`;
    t+=0.115
  }, 1000/30)

  log('Playing: Full Bodied - GHOST DATA');
})



