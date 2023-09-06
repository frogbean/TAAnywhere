let platform = '', packageJson =  electronAPI.getPackage();
(async ()=> {
  platform = await electronAPI.getPlatform();
})();

let isDragging = false
let offsetX, offsetY

const click = new Audio('click.mp3');

const fetch_mods = electronAPI.available();



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

window.addEventListener('load', async ()=>{
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

  const progress_ids = [];

  window.log = function(output) {
    console.log(`window.log ${output} ${output.startsWith("progress_id::")}`)
    if(output.startsWith("progress_id::")) {
      const progress_id = output.split('::')[1];
      const progress_report = output.split('::')[2]
      if(!progress_ids.includes(progress_id)) {
        terminalOutput.innerHTML += `<span id="${progress_id}">${output}</span><br>`
        terminal.scrollTo(0, terminalOutput.scrollHeight);
        return
      }
      return document.querySelector(`#${progress_id}`).innerHTML = progress_report;
    }

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
    t+=0.230
  }, 1000/15);

  log(`TAAnywhere version ${packageJson.version}`)
  log(`${packageJson.description}`)
  log(`https://github.com/frogbean/TAAnywhere`)
  log(`Platform: ${platform}`)
  log('Playing: Full Bodied - GHOST DATA');


  fetch_mods.then(mods => {
    select.innerHTML = ''
    if(mods.length === 0) error('Cannot find mods for your OS, This is likely a bug or the server is down')
    log(`Available mods for ${platform}: ${mods.join(', ')}`)

    for (const mod of mods) {
      const option = document.createElement('option');
      option.value = mod;
      option.text = mod;
      select.appendChild(option);
    }
  })
})



