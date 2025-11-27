let state = {
    procs: [
        {id:1, name:'P1', arrival:0, burst:5, remaining:5, color:'#3b82f6'},
        {id:2, name:'P2', arrival:1, burst:3, remaining:3, color:'#10b981'},
        {id:3, name:'P3', arrival:2, burst:8, remaining:8, color:'#f59e0b'},
        {id:4, name:'P4', arrival:3, burst:6, remaining:6, color:'#ef4444'}
    ],
    quantum: 2,
    time: 0,
    running: false,
    speed: 800,
    gantt: [],
    ready: [],
    current: null,
    completed: [],
    qCounter: 0,
    switches: 0,
    timer: null,
    lastEntered: null
};

const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
let animationQueue = [];

function renderCircle() {
    const circle = document.getElementById('circleViz');
    // Remove only process nodes, keep other elements
    const oldNodes = circle.querySelectorAll('.process-node');
    oldNodes.forEach(n => n.remove());
    
    // Get all processes to display in circle
    const allProcs = [...state.ready];
    if(state.current) {
        allProcs.unshift(state.current);
    }
    
    if(allProcs.length === 0) {
        updateCPUDisplay();
        updateWaitingArea();
        updateEntryDoor();
        return;
    }
    
    // Position processes on a circle
    const centerX = 300;
    const centerY = 300;
    const radius = 200;
    
    allProcs.forEach((proc, index) => {
        // Calculate angle based on position in queue
        // Current process is at top (270 degrees)
        // Others are distributed clockwise
        const totalProcs = allProcs.length;
        const angleDeg = 270 - (360 / totalProcs) * index;
        const angleRad = angleDeg * Math.PI / 180;
        
        // Calculate position
        const x = centerX + radius * Math.cos(angleRad);
        const y = centerY + radius * Math.sin(angleRad);
        
        // Create process node
        const node = document.createElement('div');
        node.className = 'process-node';
        node.style.background = proc.color;
        
        if(index === 0 && state.current) {
            node.classList.add('at-cpu');
        }
        
        // Center the node
        node.style.left = (x - 42.5) + 'px';
        node.style.top = (y - 42.5) + 'px';
        node.innerHTML = `
            <div class="process-name">${proc.name}</div>
            <div class="process-remaining">${proc.remaining}/${proc.burst}</div>
        `;
        circle.appendChild(node);
    });
    
    updateCPUDisplay();
    updateWaitingArea();
    updateEntryDoor();
}

function updateCPUDisplay() {
    const cpuProc = document.getElementById('cpuProc');
    const cpuQuantum = document.getElementById('cpuQuantum');
    if(state.current) {
        cpuProc.textContent = state.current.name;
        cpuProc.style.color = state.current.color;
        cpuQuantum.textContent = `Q: ${state.qCounter}/${state.quantum}`;
    } else {
        cpuProc.textContent = 'IDLE';
        cpuProc.style.color = 'white';
        cpuQuantum.textContent = '';
    }
}

function updateEntryDoor() {
    const enteringName = document.getElementById('enteringName');
    if(state.lastEntered) {
        enteringName.textContent = state.lastEntered;
        enteringName.style.color = '#fbbf24';
        setTimeout(() => {
            enteringName.textContent = '-';
            state.lastEntered = null;
        }, 1000);
    } else {
        enteringName.textContent = '-';
    }
}

function updateWaitingArea() {
    const waitingArea = document.getElementById('waitingArea');
    const waitingProcs = state.procs.filter(p => 
        p.arrival > state.time && 
        p.remaining > 0
    );
    
    if(waitingProcs.length > 0) {
        const waitingHTML = `<div class="waiting-label">⏳ NEW State<br>(Waiting)</div>` + 
            waitingProcs.map(p => `
            <div class="waiting-process" style="background: ${p.color};">
                <div style="font-size: 1rem;">${p.name}</div>
                <div style="font-size: 0.65rem; opacity: 0.9; margin-top: 2px;">T=${p.arrival}</div>
            </div>
        `).join('');
        waitingArea.innerHTML = waitingHTML;
        waitingArea.style.display = 'flex';
    } else {
        waitingArea.innerHTML = '<div class="waiting-label">⏳ NEW State<br>(Empty)</div>';
        waitingArea.style.display = 'flex';
    }
}

function render() {
    document.getElementById('time').textContent = state.time;
    renderCircle();
    
    const completedList = document.getElementById('completedList');
    if(state.completed.length === 0) {
        completedList.innerHTML = '<span style="color: #9ca3af;">No processes completed yet</span>';
    } else {
        completedList.innerHTML = state.completed.map(p=>
            `<div class="completed-badge" style="border-color: ${p.color};">${p.name} ✓</div>`
        ).join('');
    }
    
    const table = document.getElementById('ptable');
    table.innerHTML = state.procs.map(p=>`<tr>
        <td><span style="display:inline-block; width:25px; height:25px; background:${p.color}; border-radius:50%; margin-right:8px; vertical-align:middle;"></span><strong>${p.name}</strong></td>
        <td><input type="number" value="${p.arrival}" data-id="${p.id}" data-field="arrival" class="proc-input" ${state.running?'disabled':''}></td>
        <td><input type="number" value="${p.burst}" data-id="${p.id}" data-field="burst" class="proc-input" ${state.running?'disabled':''}></td>
        <td><strong>${p.remaining}</strong></td>
        <td><button class="btn-delete del-btn" data-id="${p.id}" ${state.running||state.procs.length===1?'disabled':''}>Delete</button></td>
    </tr>`).join('');
    
    // Attach event listeners after rendering
    attachEventListeners();
    
    const gantt = document.getElementById('gantt');
    if(state.gantt.length === 0) {
        gantt.innerHTML = '<div style="color:#9ca3af; padding:20px;">Execution not started</div>';
    } else {
        gantt.innerHTML = state.gantt.map(g=>
            `<div class="gantt-block" style="background:${g.color};" title="${g.proc} at t=${g.time}">${g.proc}<div class="gantt-time">${g.time}</div></div>`
        ).join('');
        
        // Scroll to the end of the Gantt chart
        gantt.scrollLeft = gantt.scrollWidth;
    }
}

function attachEventListeners() {
    document.querySelectorAll('.proc-input').forEach(inp => {
        inp.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            const field = this.dataset.field;
            const val = parseInt(this.value) || 0;
            state.procs = state.procs.map(p => {
                if(p.id === id) {
                    return {...p, [field]: val, remaining: field === 'burst' ? val : p.remaining};
                }
                return p;
            });
            render();
        });
    });
    
    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            if(state.procs.length > 1 && !state.running) {
                state.procs = state.procs.filter(p => p.id !== id);
                render();
            }
        });
    });
}

function scheduleRR() {
    // Add newly arrived processes to ready queue
    const arrived = state.procs.filter(p => 
        p.arrival <= state.time && 
        p.remaining > 0 && 
        !state.ready.some(r => r.id === p.id) && 
        (!state.current || state.current.id !== p.id)
    );
    
    arrived.forEach(p => {
        state.ready.push({...p});
        state.lastEntered = p.name;
        showNotification(`${p.name} entered ready queue!`);
    });

    // If no current process, pick from ready queue
    if(!state.current && state.ready.length > 0) {
        state.current = state.ready.shift();
        state.qCounter = 0;
        state.switches++;
        return; // Don't execute in this time unit since we just picked
    }

    // Execute current process
    if(state.current) {
        state.current.remaining--;
        state.gantt.push({proc: state.current.name, time: state.time, color: state.current.color});
        state.qCounter++;

        if(state.current.remaining === 0) {
            // Process completed
            const completedProc = {
                ...state.current,
                completion: state.time + 1,
                turnaround: (state.time + 1) - state.current.arrival,
                waiting: (state.time + 1) - state.current.arrival - state.current.burst
            };
            state.completed.push(completedProc);
            showNotification(`${state.current.name} completed!`);
            
            // Remove completed process from original array
            state.procs = state.procs.map(p => 
                p.id === state.current.id ? {...state.current, remaining: 0} : p
            );
            
            // Pick next process
            if(state.ready.length > 0) {
                state.current = state.ready.shift();
                state.qCounter = 0;
                state.switches++;
            } else {
                state.current = null;
                state.qCounter = 0;
            }
        } else if(state.qCounter >= state.quantum) {
            // Time quantum exhausted, move to back of queue
            state.ready.push({...state.current});
            showNotification(`${state.current.name} moved to back of queue`);
            
            // Pick next process
            if(state.ready.length > 0) {
                state.current = state.ready.shift();
                state.qCounter = 0;
                state.switches++;
            } else {
                state.current = null;
                state.qCounter = 0;
            }
        }
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function step() {
    scheduleRR();
    render();
    
    if(state.completed.length === state.procs.length && state.completed.length > 0) {
        state.running = false;
        document.getElementById('playBtn').textContent = '▶ Start Execution';
        clearInterval(state.timer);
        showStats();
        showNotification(`All processes completed! Total time: ${state.time}`);
    }
}

function showStats() {
    const grid = document.getElementById('statsGrid');
    const tw = state.completed.reduce((s, p) => s + p.waiting, 0);
    const tt = state.completed.reduce((s, p) => s + p.turnaround, 0);
    const tb = state.completed.reduce((s, p) => s + p.burst, 0);
    grid.innerHTML = `
        <div class="stat-card"><div class="stat-label">Avg Waiting Time</div><div class="stat-value">${(tw/state.completed.length).toFixed(2)}</div></div>
        <div class="stat-card"><div class="stat-label">Avg Turnaround Time</div><div class="stat-value">${(tt/state.completed.length).toFixed(2)}</div></div>
        <div class="stat-card"><div class="stat-label">CPU Utilization</div><div class="stat-value">${((tb/state.time)*100).toFixed(1)}%</div></div>
        <div class="stat-card"><div class="stat-label">Throughput</div><div class="stat-value">${(state.completed.length/state.time).toFixed(2)}</div></div>
        <div class="stat-card"><div class="stat-label">Context Switches</div><div class="stat-value">${state.switches}</div></div>
    `;
    document.getElementById('stats').style.display = 'block';
}

document.getElementById('playBtn').addEventListener('click', function() {
    if (!state.running) {
        // Reset state if we're starting fresh
        if (state.time === 0) {
            state.procs = state.procs.map(p => ({...p, remaining: p.burst}));
            state.completed = [];
            state.gantt = [];
            state.ready = [];
            state.current = null;
            state.switches = 0;
            state.qCounter = 0;
        }
        
        state.running = true;
        this.textContent = '⏸ Pause';
        state.timer = setInterval(() => {
            state.time++;
            step();
        }, state.speed);
    } else {
        state.running = false;
        this.textContent = '▶ Start Execution';
        clearInterval(state.timer);
    }
});

document.getElementById('resetBtn').addEventListener('click', function() {
    clearInterval(state.timer);
    state.time = 0;
    state.running = false;
    state.gantt = [];
    state.ready = [];
    state.current = null;
    state.completed = [];
    state.qCounter = 0;
    state.switches = 0;
    state.lastEntered = null;
    state.procs = state.procs.map(p => ({...p, remaining: p.burst}));
    document.getElementById('playBtn').textContent = '▶ Start Execution';
    document.getElementById('stats').style.display = 'none';
    render();
    showNotification("Simulation reset!");
});

document.getElementById('addBtn').addEventListener('click', function() {
    if(!state.running) {
        const newId = Math.max(...state.procs.map(p => p.id), 0) + 1;
        state.procs.push({
            id: newId,
            name: `P${newId}`,
            arrival: state.time,
            burst: 5,
            remaining: 5,
            color: colors[newId % colors.length]
        });
        render();
        showNotification(`Process ${'P' + newId} added!`);
    }
});

document.getElementById('quantum').addEventListener('input', function() {
    state.quantum = parseInt(this.value);
    document.getElementById('qVal').textContent = this.value;
});

document.getElementById('speedSlider').addEventListener('input', function() {
    state.speed = parseInt(this.value);
    document.getElementById('sVal').textContent = this.value;
    if(state.running) {
        clearInterval(state.timer);
        state.timer = setInterval(() => {
            state.time++;
            step();
        }, state.speed);
    }
});

render();
