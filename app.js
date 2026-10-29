const STORAGE_KEY = 'todos';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const empty = document.getElementById('empty');
const count = document.getElementById('count');
const clearDone = document.getElementById('clear-done');
const filterButtons = document.querySelectorAll('.filters button');

let todos = load();
let filter = 'all';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 메모리에만 유지
  }
}

function update() {
  save();
  render();
}

function render() {
  const visible = todos.filter(t =>
    filter === 'all' || (filter === 'done' ? t.done : !t.done)
  );

  list.replaceChildren(...visible.map(createItem));
  empty.hidden = visible.length > 0;

  const remaining = todos.filter(t => !t.done).length;
  count.textContent = `${remaining}개 남음`;
  clearDone.hidden = !todos.some(t => t.done);
}

function createItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.done ? ' done' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.addEventListener('change', () => {
    todo.done = checkbox.checked;
    update();
  });

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = todo.text;
  text.addEventListener('dblclick', () => startEdit(li, text, todo));

  const del = document.createElement('button');
  del.className = 'delete';
  del.type = 'button';
  del.textContent = '✕';
  del.setAttribute('aria-label', '삭제');
  del.addEventListener('click', () => {
    todos = todos.filter(t => t.id !== todo.id);
    update();
  });

  li.append(checkbox, text, del);
  return li;
}

function startEdit(li, text, todo) {
  const edit = document.createElement('input');
  edit.className = 'edit';
  edit.value = todo.text;
  edit.maxLength = 200;
  li.replaceChild(edit, text);
  edit.focus();

  let finished = false;
  const finish = (commit) => {
    if (finished) return;
    finished = true;
    const value = edit.value.trim();
    if (commit && value) todo.text = value;
    else if (commit && !value) todos = todos.filter(t => t.id !== todo.id);
    update();
  };

  edit.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  edit.addEventListener('blur', () => finish(true));
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  todos.push({ id: Date.now() + Math.random(), text: value, done: false });
  input.value = '';
  update();
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

clearDone.addEventListener('click', () => {
  todos = todos.filter(t => !t.done);
  update();
});

render();
