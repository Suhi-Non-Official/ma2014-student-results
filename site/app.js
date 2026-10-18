'use strict';

const quizzes = [
  {title:'Quiz 1', topic:'Laplace transforms', questions:[]},
  {title:'Quiz 2', topic:'Fourier cosine series', questions:[{title:'Question 1', topic:'Cosine expansion and reciprocal-square identity', max:20, parts:[['Constant coefficient, a₀',3],['Cosine coefficients, aₙ',8],['Fourier cosine series',3],['Derivation of the reciprocal-square identity',6]]}]},
  {title:'Quiz 3', topic:'Separation of variables', questions:[{title:'Question 1', topic:'Partial differential equation', max:20, parts:[['Product form, u(x, y) = X(x)Y(y)',2],['Substitution into the PDE',2],['Separation of variables',4],['Solution for X(x)',4],['Solution for Y(y)',4],['Application of the given condition',3],['Final solution',1]]}]},
  {title:'Quiz 4', topic:'Singular points and power series', questions:[{title:'Question 1', topic:'Singular points and classification', max:8, parts:[['Identification of singular points',2],['P test at x = 1',1],['Q test at x = 1',1],['Classification at x = 1',1],['P test at x = −2',1],['Q test at x = −2',1],['Classification at x = −2',1]]},{title:'Question 2', topic:'Power-series solution about x = 0', max:12, parts:[['Power series and derivatives',2],['Substitution and alignment of powers',2],['Recurrence relation',2],['Even-power series',2],['Odd-power series',2],['General solution',2]]}]},
  {title:'Quiz 5', topic:'Fourier transforms', questions:[{title:'Question 1', topic:'Transform of the triangular function', max:10, parts:[['Transform definition and limits',2],['Symmetry or equivalent splitting',2],['Integration and simplification',4],['Final transform and value at zero',2]]},{title:'Question 2', topic:'Inverse transform using correlation', max:10, parts:[['Factorization',2],['Fourier transform pairs',4],['Correlation or equivalent method',2],['Required function or integral',2]]}]},
];

const makeupQuizzes = {
  1: {title:'Quiz 1',topic:'Makeup · Laplace transforms',questions:[
    {title:'Question 1',topic:'Inverse Laplace transform with a delay',max:10,parts:[['Combine the exponential factors',2],['Base inverse Laplace transform',3],['Second shifting theorem',3],['Final delayed function',2]]},
    {title:'Question 2',topic:'Initial value problem',max:10,parts:[['Laplace transform and initial conditions',3],['Simplification of Y(s)',2],['Partial fractions',3],['Inverse Laplace transform',2]]}]},
  2: {title:'Quiz 2',topic:'Makeup · Fourier sine series',questions:[
    {title:'Question 1',topic:'Sine expansion and alternating odd-cubic identity',max:20,parts:[['Sine-series setup',3],['Calculation of the sine coefficients',8],['Fourier sine series',3],['Deduction of the identity',6]]}]},
  3: {...quizzes[2],topic:'Makeup · Separation of variables'},
  5: {title:'Quiz 5',topic:'Makeup · Fourier transforms',questions:[
    {title:'Question 1',topic:'Transform of shifted exponentials',max:10,parts:[['Transform of the first exponential',3],['Transform of the shifted exponential',4],['Final transform',3]]},
    {title:'Question 2',topic:'Inverse transform using partial fractions',max:10,parts:[['Factorization and simplification',3],['Partial fractions',3],['Inverse transform and sidedness',4]]}]},
};

const $ = id => document.getElementById(id);
const form = $('lookup-form');
const input = $('index-number');
const encoder = new TextEncoder();
let currentStudent = null;
let busy = false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function format(value) { return new Intl.NumberFormat('en', {maximumFractionDigits:2}).format(value); }
function score(value, max, className, status) {
  const node = el('span', className);
  if (value === null) {
    node.append(el('span','empty-score',status === 'pending' ? 'Pending' : 'Absent'),el('small','',` / ${max}`));
  } else {
    node.append(document.createTextNode(format(value)),el('small','',` / ${max}`));
  }
  return node;
}
function note(message, className) {
  const node = el('div',className);
  const icon = el('span','small-symbol','i');
  icon.setAttribute('aria-hidden','true');
  node.append(icon,el('p','',message));
  return node;
}
function schemeImages(assets,description) {
  const group=el('div','scheme-images');
  assets.forEach((asset,i)=>{
    const link=el('a','scheme-image-link');link.href=asset.src;link.target='_blank';link.rel='noopener';
    link.setAttribute('aria-label',`Open full-size ${description}${assets.length>1 ? `, section ${i+1}` : ''}`);
    const image=el('img','scheme-image');image.src=asset.src;
    image.width=asset.width;image.height=asset.height;image.loading='lazy';image.decoding='async';
    image.alt=`${description}${assets.length>1 ? ` (continued section ${i+1})` : ''} from the marking scheme. Open the image to enlarge the working.`;
    link.append(image);group.append(link);
  });
  return group;
}
function renderStudent(student) {
  currentStudent = student;
  $('student-name').textContent = student.name || 'Name not available';
  $('student-index').textContent = student.index;
  $('student-email').textContent = student.email || 'Email not available';
  $('student-avatar').textContent = student.name ? student.name.split(/\s+/)[0].slice(0,2) : '∂';
  const marked = student.quizzes.filter(q => q.total !== null);
  const pending = student.quizzes.filter(q => q.status === 'pending');
  const total = marked.reduce((sum,q) => sum + q.total,0);
  $('overall-score').replaceChildren(score(pending.length ? null : total,100,undefined,pending.length ? 'pending' : undefined));
  $('recorded-count').textContent = pending.length ? `${pending.length} of 5 quiz results pending` : `${marked.length} of 5 quizzes marked · 20 marks per quiz`;
  const overview = $('quiz-overview');
  const details = $('quiz-details');
  overview.replaceChildren(); details.replaceChildren();
  quizzes.forEach((originalQuiz, i) => {
    const data = student.quizzes[i];
    const isMakeup = data.type === 'makeup';
    const quiz = isMakeup ? makeupQuizzes[i+1] : originalQuiz;
    const anchor = el('a','quiz-tile');
    if(isMakeup) anchor.classList.add('makeup-tile');
    anchor.href = `#quiz-${i+1}`;
    const top = el('span','tile-top');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg','svg');
    arrow.setAttribute('class','arrow-icon tile-arrow');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg','path');
    arrowPath.setAttribute('d','M6 18 18 6M6 6h12v12');arrow.append(arrowPath);
    top.append(el('span','',quiz.title),arrow);
    const bar = el('div','mini-bar'); bar.setAttribute('aria-hidden','true');
    const fill = el('span'); fill.style.width = `${data.total === null ? 0 : data.total/20*100}%`;bar.append(fill);
    const tileScore = score(data.total,20,'tile-score',data.status);
    if(data.total === null) tileScore.classList.add('missing');
    anchor.append(top,tileScore,bar);overview.append(anchor);
    if(isMakeup) anchor.append(el('span','makeup-badge','Makeup quiz'));

    const card = el('details','quiz-card'); card.id = `quiz-${i+1}`;card.open = false;
    if(isMakeup) card.classList.add('makeup-card');
    const summary = el('summary');
    const title = el('div','quiz-title');
    title.append(el('h3','',quiz.title),el('span','quiz-subtitle',quiz.topic),el('span','quiz-open-hint','Select to view questions & marking scheme'));
    if(isMakeup) title.append(el('span','makeup-badge','Makeup quiz'));
    const toggle=el('span','quiz-toggle');toggle.setAttribute('aria-hidden','true');
    const toggleLabel=el('span','quiz-toggle-label','Expand');
    const toggleSymbol=el('span','quiz-toggle-symbol','+');
    toggle.append(toggleLabel,toggleSymbol);
    card.addEventListener('toggle',()=>{
      toggleLabel.textContent=card.open?'Collapse':'Expand';
      toggleSymbol.textContent=card.open?'−':'+';
      title.querySelector('.quiz-open-hint').textContent=card.open?'Select to close marking scheme':'Select to view questions & marking scheme';
    });
    anchor.addEventListener('click',()=>{card.open=true;});
    summary.append(el('span','quiz-number',String(i+1).padStart(2,'0')),title,score(data.total,20,'quiz-total',data.status),toggle);
    const body = el('div','quiz-body');
    if(isMakeup) body.append(note('This result is from the makeup quiz. Your marks and the matching makeup marking scheme are shown below. It counts toward the same quiz in your CA total.','makeup-note'));
    if(data.status === 'pending') {
      body.append(note('Pending — your marks for this quiz are not yet available.','unavailable-note'));
    } else if(i === 0 && !isMakeup) {
      body.append(note('All marking has been made on your answer script. Please refer to your marked answer script for question-level marks and feedback.','script-note'));
      const topics=['Inverse Laplace transform','Initial value problem using Laplace transforms'];
      (window.markingSchemeSections?.[1] || []).forEach((scheme,q)=>{
        const section=el('section','question quiz-one-question');
        const header=el('div','question-heading');const heading=el('h4','',`Question ${q+1}`);
        heading.append(el('span','question-topic',topics[q]));
        header.append(heading,el('span','question-score','Maximum: 10 marks'));
        const prompt=el('div','scheme-prompt');prompt.append(el('span','scheme-label','QUESTION'),schemeImages(scheme.prompt,`Quiz 1, Question ${q+1}, question`));
        const working=el('div','quiz-one-working');working.append(el('span','scheme-label','MARKING SCHEME'),schemeImages(scheme.parts[0],`Quiz 1, Question ${q+1}, worked solution`));
        section.append(header,prompt,working);body.append(section);
      });
      if(data.total === null) body.append(note('Absent — no mark is recorded for this quiz.','unavailable-note'));
    } else if(data.parts === null) {
      body.append(note(data.total === null ? 'Absent — no mark is recorded for this quiz. Please contact your instructor if you submitted an answer.' : 'Your total mark is recorded. A detailed question breakdown is not yet available in the supplied register.','unavailable-note'));
    } else {
      let offset = 0;
      quiz.questions.forEach((question,questionIndex) => {
        const section = el('section','question');
        const header = el('div','question-heading');
        const heading = el('h4','',question.title);
        heading.append(el('span','question-topic',question.topic));
        const values = data.parts.slice(offset,offset+question.parts.length);
        const qTotal = values.reduce((a,b)=>a+b,0);
        header.append(heading,el('span','question-score',`${format(qTotal)} / ${question.max}`));
        section.append(header);
        const scheme=(isMakeup ? window.makeupSchemeSections : window.markingSchemeSections)?.[i+1]?.[questionIndex];
        if(scheme){
          const prompt=el('div','scheme-prompt');
          prompt.append(el('span','scheme-label','QUESTION'),schemeImages(scheme.prompt,`${quiz.title}, ${question.title}, question`));
          section.append(prompt,el('p','scheme-enlarge-hint','Select any section to view the working at full size.'));
        }
        const list = el('div',scheme ? 'scheme-parts' : 'part-list');
        question.parts.forEach(([label,max],j) => {
          if(scheme){
            const block=el('section','scheme-part');
            const heading=el('div','scheme-part-heading');
            const title=el('h5','',label);
            const awarded=el('span','scheme-awarded');
            awarded.append(el('span','scheme-score-label','YOUR MARK'),el('strong','',`${format(values[j])} / ${max}`));
            heading.append(title,awarded);
            block.append(heading,schemeImages(scheme.parts[j],`${quiz.title}, ${question.title}, ${label}`));
            list.append(block);return;
          }
          const row = el('div','part');
          const value = el('dd','',format(values[j]));
          value.append(el('span','',` / ${max}`));
          row.append(el('dt','',label),value);list.append(row);
        });
        offset += question.parts.length;
        section.append(list);body.append(section);
      });
    }
    card.append(summary,body);details.append(card);
  });
  $('lookup-view').hidden = true;
  $('results-view').hidden = false;
  $('switch-student').hidden = false;
  $('live-status').textContent = `Results loaded for ${student.index}. ${marked.length} quizzes recorded.`;
  document.title = 'Your results · MA2014';
  window.scrollTo(0,0);
  $('results-heading').focus({preventScroll:true});
}
async function sha256(text) { return crypto.subtle.digest('SHA-256', encoder.encode(text)); }
function fromBase64(text) { return Uint8Array.from(atob(text),c=>c.charCodeAt(0)); }
function validateRecord(student, index) {
  if (student.index !== index || !Array.isArray(student.quizzes) || student.quizzes.length !== 5) throw new Error('record');
  student.quizzes.forEach((quiz,i) => {
    if(quiz.status !== undefined && quiz.status !== 'pending') throw new Error('record');
    if(quiz.status === 'pending' && (quiz.total !== null || quiz.parts !== null)) throw new Error('record');
    if(quiz.type !== undefined && quiz.type !== 'makeup') throw new Error('record');
    if(quiz.type === 'makeup' && !makeupQuizzes[i+1]) throw new Error('record');
    if(quiz.total !== null && (typeof quiz.total !== 'number' || !Number.isFinite(quiz.total) || quiz.total<0 || quiz.total>20)) throw new Error('record');
    if(quiz.parts !== null) {
      const caps = (quiz.type === 'makeup' ? makeupQuizzes[i+1] : quizzes[i]).questions.flatMap(q=>q.parts.map(p=>p[1]));
      if(quiz.parts.length !== caps.length || quiz.parts.some((v,j)=>typeof v !== 'number' || !Number.isFinite(v) || v<0 || v>caps[j]) || Math.abs(quiz.parts.reduce((a,b)=>a+b,0)-quiz.total)>0.001) throw new Error('record');
    }
  });
}
function showError(message) {
  $('lookup-error').textContent = message;
  $('lookup-error').hidden = false;
  input.setAttribute('aria-invalid','true');
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if(busy) return;
  const index = input.value.trim().toUpperCase();input.value = index;
  $('lookup-error').hidden = true;input.removeAttribute('aria-invalid');
  if(!/^\d{6}[A-Z]$/.test(index)) {
    showError('Please enter a full index number: six digits followed by one letter, for example 240015P.');input.focus();return;
  }
  if(!crypto.subtle) { showError('Please open this page using its secure HTTPS link or a local preview server.');return; }
  busy = true;$('lookup-submit').disabled = true;
  $('lookup-submit').firstElementChild.textContent = 'Finding your results…';
  $('live-status').textContent = 'Loading your results.';
  try {
    const hash = await sha256('ma2014:lookup:v1:'+index);
    const filename = Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const response = await fetch(`records/${filename[0]}.json`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(response.status === 404) { showError('No student record was found for that index. Please check the number and final letter, or contact your instructor.');return; }
    if(!response.ok) throw new Error('network');
    const bucket = await response.json();
    const encrypted = bucket[filename];
    if(!encrypted) { showError('No student record was found for that index. Please check the number and final letter, or contact your instructor.');return; }
    const key = await crypto.subtle.importKey('raw',await sha256('ma2014:record:v1:'+index),'AES-GCM',false,['decrypt']);
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(encrypted.iv)},key,fromBase64(encrypted.data));
    const student = JSON.parse(new TextDecoder().decode(plain));
    validateRecord(student,index);
    renderStudent(student);
  } catch(error) {
    if(error.name === 'TimeoutError' || error instanceof TypeError || error.message === 'network') showError('Your results could not be loaded. Please check your internet connection and try again.');
    else showError('This result could not be read. Please try again or contact your instructor.');
  } finally {
    busy = false;$('lookup-submit').disabled = false;
    $('lookup-submit').firstElementChild.textContent = 'View my results';
    if(!$('lookup-error').hidden) $('live-status').textContent = $('lookup-error').textContent;
  }
});
input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');$('lookup-error').hidden = true;});
$('switch-student').addEventListener('click',()=>{
  currentStudent = null;
  $('results-view').hidden = true;$('lookup-view').hidden = false;$('switch-student').hidden = true;
  $('quiz-overview').replaceChildren();$('quiz-details').replaceChildren();
  for(const id of ['student-name','student-index','student-email','student-avatar','overall-score','recorded-count']) $(id).replaceChildren();
  input.value = '';document.title = 'MA2014 · Student results';
  history.replaceState(null,'',location.pathname);
  window.scrollTo(0,0);input.focus();
});
$('print-results').addEventListener('click',()=>{
  document.querySelectorAll('.quiz-card').forEach(card=>card.open = true);window.print();
});
document.querySelector('.brand').addEventListener('click',event=>{
  if(currentStudent) { event.preventDefault();$('switch-student').click(); }
});
fetch('metadata.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(meta=>{
  if(meta?.updated && /^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) {
    const date = new Date(meta.updated+'T00:00:00');
    $('last-updated').textContent = 'Results updated '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(date);
  }
}).catch(()=>{});
