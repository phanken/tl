const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], money=n=>Math.round(n||0).toLocaleString('vi-VN')+'đ';
const defaults={StandardDays:26,AttendanceBonus:400000,InsuranceRate:.105,UnionRate:.005,NormalOvertimeRate:1.5,SundayDayRate:2,SundayNightRate:2.8,NightExtraRate:.3,NightOvertimeAfter2Rate:2.15,NightExtraHours:6,SundayDefaultHours:11,LeaveAccrualDay:16,LeaveAccrualAmount:1};
const newEmp=()=>({Id:crypto.randomUUID(),Name:'Nhân viên 1',Department:'Cá nhân',Code:'NV01',SalaryBase:8500000,OvertimeBase:7000000,AnnualLeaveBalance:0,LastLeaveAccrualDate:new Date().toISOString()});
let data=JSON.parse(localStorage.getItem('chamcong_data')||'null')||{Employees:[newEmp()],Attendance:[],LeaveAccruals:[],Settings:{...defaults}}; data.Settings={...defaults,...data.Settings};
let current=data.Employees[0], selected=new Date(), calDate=new Date(), month=new Date().getMonth()+1, year=new Date().getFullYear();
const cfg=()=>JSON.parse(localStorage.getItem('github_cfg')||'{}');
function saveLocal(){localStorage.setItem('chamcong_data',JSON.stringify(data)); renderAll()}
function isoDate(d){let x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function fmt(d){return new Date(d).toLocaleDateString('vi-VN')}
function typeName(t){return ['Đi làm','Nghỉ phép','Tăng ca','Nghỉ lễ'][+t]||t}
function typeVal(t){return typeof t==='number'?t:{Work:0,PaidLeave:1,OvertimeOnly:2,Holiday:3}[t]??+t}
function shiftVal(s){return s===1||s==='Night'?'Night':'Day'}
function paid(r){let t=typeVal(r.Type);return t===0?1:(t===1||t===3?(+r.PaidDayUnits||1):0)}
function rowsFor(emp,m=month,y=year){return data.Attendance.filter(r=>r.EmployeeId===emp.Id&&new Date(r.Date).getMonth()+1===m&&new Date(r.Date).getFullYear()===y)}
function salary(emp,rows,m=month,y=year,bonus=true){let s=data.Settings,sd=s.StandardDays>0?s.StandardDays:26,sb=+emp.SalaryBase||8500000,ob=+emp.OvertimeBase||7000000,daily=sb/sd,hour=ob/sd/8,R={PaidDays:0,WorkedDays:0,LeaveDays:0,BasePay:0,DayOtPay:0,NightOtPay:0,NightExtraPay:0,SundayDayPay:0,SundayNightPay:0,AttendanceBonus:0,Insurance:0,UnionFee:0,Gross:0,Net:0};
for(const r of rows){let d=new Date(r.Date),sun=d.getDay()===0,t=typeVal(r.Type),night=shiftVal(r.Shift)==='Night',h=+r.OvertimeHours||0;if(t===1&&!sun){R.LeaveDays+=+r.PaidDayUnits||1;R.PaidDays+=1;continue}if(t===3&&!sun){R.PaidDays+=+r.PaidDayUnits||1;continue}if(t===0){if(!sun){R.WorkedDays++;R.PaidDays++;if(night)R.NightExtraPay+=hour*s.NightExtraHours*s.NightExtraRate;if(h>0){if(night)R.NightOtPay+=hour*(Math.min(h,2)*s.NormalOvertimeRate+Math.max(h-2,0)*s.NightOvertimeAfter2Rate);else R.DayOtPay+=hour*h*s.NormalOvertimeRate}}else{h=h>0?h:s.SundayDefaultHours;if(night)R.SundayNightPay+=hour*h*s.SundayNightRate;else R.SundayDayPay+=hour*h*s.SundayDayRate}}else if(t===2){if(sun){if(night)R.SundayNightPay+=hour*h*s.SundayNightRate;else R.SundayDayPay+=hour*h*s.SundayDayRate}else if(night)R.NightOtPay+=hour*(Math.min(h,2)*s.NormalOvertimeRate+Math.max(h-2,0)*s.NightOvertimeAfter2Rate);else R.DayOtPay+=hour*h*s.NormalOvertimeRate}}
R.BasePay=daily*R.PaidDays;R.AttendanceBonus=bonus?s.AttendanceBonus:0;R.Insurance=sb*s.InsuranceRate;R.UnionFee=sb*s.UnionRate;R.Gross=R.BasePay+R.DayOtPay+R.NightOtPay+R.NightExtraPay+R.SundayDayPay+R.SundayNightPay+R.AttendanceBonus;R.Net=R.Gross-R.Insurance-R.UnionFee;return R}
function applyLeave(){let today=new Date(),day=Math.max(1,Math.min(28,+data.Settings.LeaveAccrualDay||16)),amt=Math.max(0,+data.Settings.LeaveAccrualAmount||0),changed=false;for(const e of data.Employees){if(!e.LastLeaveAccrualDate){e.LastLeaveAccrualDate=today.toISOString();changed=true;continue}let cursor=new Date(e.LastLeaveAccrualDate), m=new Date(cursor.getFullYear(),cursor.getMonth(),1),end=new Date(today.getFullYear(),today.getMonth(),1);while(m<=end){let d=new Date(m.getFullYear(),m.getMonth(),day);if(d>cursor&&d<=today){e.AnnualLeaveBalance=(+e.AnnualLeaveBalance||0)+amt;if(!data.LeaveAccruals.some(a=>a.EmployeeId===e.Id&&isoDate(a.Date)===isoDate(d)))data.LeaveAccruals.push({Id:crypto.randomUUID(),EmployeeId:e.Id,Date:d.toISOString(),Amount:amt,Note:`Tự cộng phép tháng ${m.getMonth()+1}/${m.getFullYear()}`});cursor=d;changed=true}m.setMonth(m.getMonth()+1)}e.LastLeaveAccrualDate=cursor.toISOString()}if(changed)localStorage.setItem('chamcong_data',JSON.stringify(data))}
function renderAll(){if(!data.Employees.find(e=>e.Id===current?.Id))current=data.Employees[0];renderProfile();renderCalendar();renderDay();renderMonth();renderEmployees();renderOT();renderLeave();renderPayroll();renderRules();updateSync()}
function renderProfile(){let initials=current.Name.split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase();$('#avatar').textContent=initials;$('#empName').textContent=current.Name;$('#empMeta').textContent=`Mã NV: ${current.Code} • Phép còn: ${+current.AnnualLeaveBalance||0} ngày`;$('#empSalary').textContent=`Lương công ${money(current.SalaryBase)} • OT ${money(current.OvertimeBase)}`;$('#employeeCards').innerHTML=data.Employees.map(e=>`<button class="emp-card ${e.Id===current.Id?'active':''}" data-eid="${e.Id}"><b>${e.Code}</b><br>${e.Name}</button>`).join('');$$('[data-eid]').forEach(b=>b.onclick=()=>{current=data.Employees.find(e=>e.Id===b.dataset.eid);renderAll()})}
function renderCalendar(){let y=calDate.getFullYear(),m=calDate.getMonth();$('#calTitle').textContent=`Tháng ${String(m+1).padStart(2,'0')}/${y}`;let first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset),html='';for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);let rs=data.Attendance.filter(r=>r.EmployeeId===current.Id&&isoDate(r.Date)===isoDate(d)),cls=['day'];if(d.getMonth()!==m)cls.push('other');if(d.getDay()===0)cls.push('sunday');if(isoDate(d)===isoDate(selected))cls.push('selected');let dot='';if(rs.some(r=>typeVal(r.Type)===1))dot='<i class="dot leaveDot"></i>';else if(rs.some(r=>typeVal(r.Type)===2||+r.OvertimeHours>0))dot='<i class="dot otdot"></i>';else if(rs.length)dot='<i class="dot"></i>';html+=`<button class="${cls.join(' ')}" data-date="${isoDate(d)}">${d.getDate()}${dot}</button>`}$('#calendarDays').innerHTML=html;$$('.day').forEach(b=>b.onclick=()=>{selected=new Date(b.dataset.date+'T12:00:00');calDate=new Date(selected);renderCalendar();renderDay()})}
function renderDay(){let rs=data.Attendance.filter(r=>r.EmployeeId===current.Id&&isoDate(r.Date)===isoDate(selected));$('#selectedDate').textContent=fmt(selected);$('#detailDate').textContent=fmt(selected)+(selected.getDay()===0?' • Chủ nhật':'');$('#dayDetail').textContent=rs.length?rs.map(r=>`● ${typeName(typeVal(r.Type))} • ${shiftVal(r.Shift)==='Day'?'Ca ngày':'Ca đêm'}\n  Công: ${paid(r)}   OT: ${+r.OvertimeHours||0} giờ`).join('\n\n'):'Chưa có chấm công.\n\nChọn ngày trên lịch để xem chi tiết.'}
function renderMonth(){$('#month').value=month;$('#year').value=year;$('#monthTitle').textContent=`Tổng kết tháng ${String(month).padStart(2,'0')}/${year}`;let rs=rowsFor(current).sort((a,b)=>new Date(b.Date)-new Date(a.Date));$('#attendanceRows').innerHTML=rs.map(r=>`<tr><td>${fmt(r.Date)}</td><td>${typeName(typeVal(r.Type))}</td><td>${shiftVal(r.Shift)==='Day'?'Ngày':'Đêm'}</td><td>${paid(r)}</td><td>${+r.OvertimeHours||0}</td><td>${new Date(r.Date).getDay()===0?'Chủ nhật':r.Note||''}</td></tr>`).join('')||'<tr><td colspan="6">Chưa có dữ liệu.</td></tr>';let s=salary(current,rs,month,year,$('#bonus').checked);let lines=[['Lương công',s.BasePay],['OT ngày',s.DayOtPay],['OT đêm',s.NightOtPay],['Ca đêm +30%',s.NightExtraPay],['Chủ nhật',s.SundayDayPay+s.SundayNightPay],['Chuyên cần',s.AttendanceBonus],['Bảo hiểm',-s.Insurance],['Công đoàn',-s.UnionFee]];$('#salaryLines').innerHTML=lines.map(x=>`<div class="salary-line"><span>${x[0]}</span><strong>${x[1]<0?'− ':''}${money(Math.abs(x[1]))}</strong></div>`).join('');$('#netPay').textContent=money(s.Net)}
function renderEmployees(){$('#employeeTable').innerHTML=data.Employees.map(e=>`<tr><td>${e.Code}</td><td><b>${e.Name}</b></td><td>${money(e.SalaryBase)}</td><td>${money(e.OvertimeBase)}</td><td>${+e.AnnualLeaveBalance||0} ngày</td><td><button class="outline editEmp" data-id="${e.Id}">Sửa</button></td></tr>`).join('');$$('.editEmp').forEach(b=>b.onclick=()=>employeeDialog(data.Employees.find(e=>e.Id===b.dataset.id),false))}
function renderOT(){let out=[];for(const e of data.Employees)for(const r of rowsFor(e)){let h=+r.OvertimeHours||0,d=new Date(r.Date),sun=d.getDay()===0,t=typeVal(r.Type),night=shiftVal(r.Shift)==='Night',a=0,b=0,sd=0,sn=0;if(sun&&(t===0||t===2)){h=h||data.Settings.SundayDefaultHours;if(night)sn=h;else sd=h}else if(t===2&&h>0){if(night){a=Math.min(h,2);b=Math.max(h-2,0)}else a=h}else continue;out.push([d,e,r,a,b,sd,sn])}out.sort((a,b)=>b[0]-a[0]);$('#otTable').innerHTML=out.map(x=>`<tr><td>${fmt(x[0])}</td><td>${x[1].Code}</td><td>${x[1].Name}</td><td>${shiftVal(x[2].Shift)==='Day'?'Ngày':'Đêm'}</td><td>${x[3]||''}</td><td>${x[4]||''}</td><td>${x[5]||''}</td><td>${x[6]||''}</td></tr>`).join('')||'<tr><td colspan="8">Chưa có dữ liệu.</td></tr>'}
function renderLeave(){let out=[];for(const e of data.Employees){for(const r of rowsFor(e).filter(r=>typeVal(r.Type)===1))out.push([new Date(r.Date),e,'Nghỉ phép',`-${+r.PaidDayUnits||1} ngày`,r.Note||'']);for(const a of data.LeaveAccruals.filter(a=>a.EmployeeId===e.Id&&new Date(a.Date).getMonth()+1===month&&new Date(a.Date).getFullYear()===year))out.push([new Date(a.Date),e,'Cộng phép',`+${a.Amount} ngày`,a.Note||''])}out.sort((a,b)=>b[0]-a[0]);$('#leaveTable').innerHTML=out.map(x=>`<tr><td>${fmt(x[0])}</td><td>${x[1].Code}</td><td>${x[1].Name}</td><td>${x[2]}</td><td>${x[3]}</td><td>${x[4]}</td></tr>`).join('')||'<tr><td colspan="6">Chưa có dữ liệu.</td></tr>'}
function renderPayroll(){$('#payrollTitle').textContent=`Tháng ${String(month).padStart(2,'0')}/${year}`;$('#payrollTable').innerHTML=data.Employees.map(e=>{let s=salary(e,rowsFor(e),month,year,$('#bonus').checked);return `<tr><td>${e.Code}</td><td>${e.Name}</td><td>${s.PaidDays}</td><td class="money">${money(s.BasePay)}</td><td class="money">${money(s.DayOtPay+s.NightOtPay)}</td><td class="money">${money(s.NightExtraPay)}</td><td class="money">${money(s.SundayDayPay+s.SundayNightPay)}</td><td class="money">${money(s.AttendanceBonus)}</td><td class="money">${money(s.Insurance)}</td><td class="money">${money(s.UnionFee)}</td><td class="money"><b>${money(s.Net)}</b></td></tr>`}).join('')}
const rules=[['StandardDays','Công chuẩn'],['AttendanceBonus','Thưởng chuyên cần'],['InsuranceRate','Bảo hiểm (tỷ lệ, VD 0.105)'],['UnionRate','Công đoàn (tỷ lệ)'],['NormalOvertimeRate','OT ngày thường'],['SundayDayRate','Chủ nhật ca ngày'],['SundayNightRate','Chủ nhật ca đêm'],['NightExtraRate','Phụ cấp ca đêm'],['NightOvertimeAfter2Rate','OT đêm sau 2 giờ'],['NightExtraHours','Số giờ phụ cấp đêm'],['SundayDefaultHours','Giờ CN mặc định'],['LeaveAccrualDay','Ngày tự cộng phép'],['LeaveAccrualAmount','Số phép cộng/tháng']];
function renderRules(){$('#ruleFields').innerHTML=rules.map(([k,l])=>`<label class="field"><span>${l}</span><input name="${k}" type="number" step="0.001" value="${data.Settings[k]}"></label>`).join('')}
function showModal(title,body,onOk,ok='Lưu'){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalOk').textContent=ok;let dlg=$('#modal');dlg.showModal();$('#modalForm').onsubmit=e=>{e.preventDefault();if(e.submitter?.value==='cancel'){dlg.close();return}if(onOk()!==false)dlg.close()}}
function addAttendance(kind){let d=new Date(selected),sun=d.getDay()===0,main=data.Attendance.some(r=>r.EmployeeId===current.Id&&isoDate(r.Date)===isoDate(d)&&[0,1,3].includes(typeVal(r.Type))),shift=$('input[name=shift]:checked').value;if(kind!=='ot'&&main)return alert('Ngày này đã có dữ liệu công/nghỉ.');if(kind==='leave'){if(sun)return alert('Chủ nhật không cần chấm nghỉ phép.');showModal('Nghỉ phép','<label>Số ngày phép<input id="leaveUnits" type="number" min="0.5" step="0.5" value="1"></label>',()=>{let u=+$('#leaveUnits').value;if(!u||current.AnnualLeaveBalance<u)return alert(`Không đủ phép năm. Hiện còn ${current.AnnualLeaveBalance||0} ngày.`),false;current.AnnualLeaveBalance-=u;data.Attendance.push({Id:crypto.randomUUID(),EmployeeId:current.Id,Date:d.toISOString(),Type:1,Shift:shift,OvertimeHours:0,PaidDayUnits:u,Note:`Nghỉ phép ${u} ngày`});saveLocal();autoPush()});return}if(kind==='holiday'){if(sun)return alert('Chủ nhật không tính công.');data.Attendance.push({Id:crypto.randomUUID(),EmployeeId:current.Id,Date:d.toISOString(),Type:3,Shift:shift,OvertimeHours:0,PaidDayUnits:1,Note:'Nghỉ lễ - không trừ phép'});saveLocal();autoPush();return}if(kind==='work'&&sun||kind==='ot'){showModal(kind==='work'?'Làm Chủ nhật':'Tăng ca',`<label>Số giờ<input id="hours" type="number" min="0.5" step="0.5" value="${kind==='work'?data.Settings.SundayDefaultHours:3}"></label>`,()=>{let h=+$('#hours').value;if(!(h>0))return false;data.Attendance.push({Id:crypto.randomUUID(),EmployeeId:current.Id,Date:d.toISOString(),Type:kind==='work'?0:2,Shift:shift,OvertimeHours:h,PaidDayUnits:1,Note:''});saveLocal();autoPush()});return}data.Attendance.push({Id:crypto.randomUUID(),EmployeeId:current.Id,Date:d.toISOString(),Type:0,Shift:shift,OvertimeHours:0,PaidDayUnits:1,Note:''});saveLocal();autoPush()}
function editAttendanceDialog(){
 const records=data.Attendance.filter(r=>r.EmployeeId===current.Id&&isoDate(r.Date)===isoDate(selected));
 const r=records.find(x=>[0,1,3].includes(typeVal(x.Type)))||records[0];
 if(!r){alert('Ngày này chưa có chấm công để sửa.');return}
 const safe=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const date=isoDate(r.Date),type=typeVal(r.Type),shift=shiftVal(r.Shift);
 const choices=records.length>1?`<label>Bản ghi<select id="editRecord">${records.map((x,i)=>`<option value="${i}" ${x===r?'selected':''}>${typeName(typeVal(x.Type))} • ${shiftVal(x.Shift)==='Night'?'Ca đêm':'Ca ngày'} • ${+x.OvertimeHours||0} giờ</option>`).join('')}</select></label>`:'';
 showModal('Sửa chấm công',`${choices}<label>Ngày<input id="editDate" type="date" value="${date}"></label><label>Loại công<select id="editType"><option value="0">Đi làm</option><option value="2">Tăng ca</option><option value="1">Nghỉ phép</option><option value="3">Nghỉ lễ</option></select></label><label>Ca<select id="editShift"><option value="Day">Ca ngày</option><option value="Night">Ca đêm</option></select></label><label>Số công / ngày phép<input id="editUnits" type="number" min="0" step="0.5" value="${r.PaidDayUnits??1}"></label><label>Tăng ca (giờ)<input id="editHours" type="number" min="0" step="0.5" value="${+r.OvertimeHours||0}"></label><label>Ghi chú<input id="editNote" value="${safe(r.Note)}"></label><button type="button" class="outline danger" id="editDelete">Xóa chấm công</button>`,()=>{
 const target=records[+($('#editRecord')?.value||0)]||r;
 const d=$('#editDate').value,t=+$('#editType').value,u=+$('#editUnits').value,hrs=+$('#editHours').value;
 if(!d||!Number.isFinite(u)||u<0||!Number.isFinite(hrs)||hrs<0)return alert('Kiểm tra ngày, số công và giờ tăng ca.'),false;
 const newDate=new Date(d+'T12:00:00');if(Number.isNaN(newDate.getTime()))return false;
 if(t!==2&&data.Attendance.some(x=>x.Id!==target.Id&&x.EmployeeId===current.Id&&isoDate(x.Date)===d&&[0,1,3].includes(typeVal(x.Type))))return alert('Ngày này đã có một dòng công/nghỉ.'),false;
 const oldLeave=typeVal(target.Type)===1?(+target.PaidDayUnits||1):0,newLeave=t===1?u:0;
 if((+current.AnnualLeaveBalance||0)+oldLeave<newLeave)return alert('Không đủ số ngày phép còn lại.'),false;
 current.AnnualLeaveBalance=(+current.AnnualLeaveBalance||0)+oldLeave-newLeave;
 Object.assign(target,{Date:newDate.toISOString(),Type:t,Shift:$('#editShift').value,OvertimeHours:hrs,PaidDayUnits:u,Note:$('#editNote').value});
 selected=newDate;calDate=new Date(newDate);saveLocal();autoPush();
 });
 $('#editType').value=String(type);$('#editShift').value=shift;
 const select=$('#editRecord');if(select)select.onchange=()=>{$('#modal').close();const target=records[+select.value];records.splice(records.indexOf(target),1);records.unshift(target);editAttendanceDialog()};
 $('#editDelete').onclick=()=>{const target=records[+($('#editRecord')?.value||0)]||r;if(!confirm('Xóa bản ghi chấm công này?'))return;if(typeVal(target.Type)===1)current.AnnualLeaveBalance+=(+target.PaidDayUnits||1);data.Attendance=data.Attendance.filter(x=>x.Id!==target.Id);$('#modal').close();saveLocal();autoPush()};
}
function employeeDialog(e,isNew){showModal(isNew?'Thêm nhân viên':'Sửa nhân viên',`<label>Mã nhân viên<input id="ecode" value="${e.Code||''}"></label><label>Tên nhân viên<input id="ename" value="${isNew?'':e.Name||''}"></label><label>Lương tính công<input id="esal" type="number" value="${e.SalaryBase||8500000}"></label><label>Lương tính tăng ca<input id="eot" type="number" value="${e.OvertimeBase||7000000}"></label><label>Phép năm còn lại<input id="eleave" type="number" step="0.5" value="${e.AnnualLeaveBalance||0}"></label>`,()=>{let code=$('#ecode').value.trim(),name=$('#ename').value.trim();if(!code||!name)return alert('Nhập đủ mã và tên.'),false;if(data.Employees.some(x=>x.Id!==e.Id&&x.Code.toLowerCase()===code.toLowerCase()))return alert('Mã nhân viên đã tồn tại.'),false;Object.assign(e,{Code:code,Name:name,SalaryBase:+$('#esal').value,OvertimeBase:+$('#eot').value,AnnualLeaveBalance:+$('#eleave').value});if(isNew)data.Employees.push(e);current=e;saveLocal();autoPush()})}
async function ghRequest(method,body){
  const c=cfg();
  if(!c.token) throw Error('Chưa cấu hình GitHub token');
  const owner=c.owner||'kendevill', repo=c.repo||'chamcong-data', path=c.path||'data.json', branch=c.branch||'main';
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
  const opt={method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${c.token}`,'X-GitHub-Api-Version':'2022-11-28'}};
  if(body) opt.body=JSON.stringify(body);
  const res=await fetch(url,opt);
  if(!res.ok){
    let msg=''; try{const j=await res.json();msg=j.message||JSON.stringify(j)}catch{msg=await res.text()}
    if(res.status===401) throw Error('Token GitHub không hợp lệ hoặc đã hết hạn (401).');
    if(res.status===403) throw Error('Token chưa có quyền truy cập repo/Contents (403).');
    if(res.status===404) throw Error(`Không tìm thấy ${owner}/${repo}/${path} trên branch ${branch}, hoặc token chưa được cấp quyền repo (404).`);
    throw Error(`GitHub ${res.status}: ${msg}`);
  }
  return res.json();
}
// Đồng bộ an toàn: chỉ áp dụng bản mới khi không có thay đổi đang chờ gửi.
let syncBusy=false, pendingLocal=localStorage.getItem('chamcong_pending')==='1', lastRemoteSha=localStorage.getItem('chamcong_remote_sha')||'', lastCheck=0;
const syncMessage=msg=>{$('#syncState').textContent=msg};
function decodeGithub(r){
  const raw=Uint8Array.from(atob((r.content||'').replace(/\\n/g,'')),c=>c.charCodeAt(0));
  return JSON.parse(new TextDecoder('utf-8').decode(raw));
}
async function pull(silent=false){
  if(!cfg().token){if(!silent)githubDialog();return}
  if(syncBusy)return;
  if(pendingLocal){syncMessage('Có thay đổi chưa gửi GitHub • chưa tải đè');return}
  syncBusy=true;
  try{
    if(!silent)syncMessage('Đang tải GitHub...');
    const r=await ghRequest('GET');
    if(pendingLocal){syncMessage('Có thay đổi chưa gửi GitHub');return}
    if(r.sha===lastRemoteSha){if(!silent)syncMessage('Dữ liệu GitHub đã mới nhất');return}
    const remote=decodeGithub(r);
    if(!Array.isArray(remote.Employees)||!Array.isArray(remote.Attendance))throw Error('data.json không đúng cấu trúc.');
    data=remote;data.Settings={...defaults,...data.Settings};
    current=data.Employees.find(e=>e.Id===current?.Id)||data.Employees[0];
    lastRemoteSha=r.sha;localStorage.setItem('chamcong_remote_sha',lastRemoteSha);
    // Không tự thay đổi dữ liệu từ GitHub rồi ghi ngược khi chỉ tải.
    localStorage.setItem('chamcong_data',JSON.stringify(data));
    renderAll();
    syncMessage('Đã cập nhật từ GitHub • '+new Date().toLocaleTimeString('vi-VN'));
  }catch(e){syncMessage('Không tải được GitHub'+(pendingLocal?' • còn dữ liệu chờ gửi':''));if(!silent)alert(e.message);console.error(e)}
  finally{lastCheck=Date.now();syncBusy=false}
}
async function push(){
  if(!cfg().token)return;
  pendingLocal=true;
  if(syncBusy){syncMessage('Đang chờ đồng bộ GitHub');return}
  syncBusy=true;
  try{
    const snapshot=JSON.stringify(data);
    const c=cfg(),old=await ghRequest('GET');
    // Nếu repo đã thay đổi ngoài PWA, không ghi đè âm thầm.
    if(lastRemoteSha&&old.sha!==lastRemoteSha){
      syncMessage('GitHub có dữ liệu mới • cần xử lý xung đột');
      alert('Dữ liệu GitHub đã thay đổi trên thiết bị khác. PWA chưa ghi đè để tránh mất dữ liệu. Hãy xuất JSON sao lưu, rồi tải GitHub và nhập lại thay đổi cần thiết.');
      return;
    }
    const bytes=new TextEncoder().encode(JSON.stringify(JSON.parse(snapshot),null,2));
    let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));
    const result=await ghRequest('PUT',{message:'Update attendance data from web',content:btoa(binary),sha:old.sha,branch:c.branch||'main'});
    lastRemoteSha=result.content?.sha||'';localStorage.setItem('chamcong_remote_sha',lastRemoteSha);
    pendingLocal=JSON.stringify(data)!==snapshot;localStorage.setItem('chamcong_pending',pendingLocal?'1':'0');
    syncMessage(pendingLocal?'Có thay đổi mới đang chờ gửi':'Đã lưu GitHub • '+new Date().toLocaleTimeString('vi-VN'));
  }catch(e){syncMessage('Lưu GitHub lỗi • dữ liệu vẫn còn trên máy');alert(e.message);console.error(e)}
  finally{syncBusy=false}
  if(pendingLocal&&lastRemoteSha)queueMicrotask(()=>push());
}
function autoPush(){pendingLocal=true;localStorage.setItem('chamcong_pending','1');if(cfg().token)push();else syncMessage('Chưa cấu hình GitHub • dữ liệu lưu trên máy')}
function checkRemote(){if(document.visibilityState==='visible'&&navigator.onLine&&cfg().token&&!pendingLocal&&!syncBusy)pull(true)}
setInterval(checkRemote,5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkRemote()});
window.addEventListener('focus',checkRemote);
window.addEventListener('online',checkRemote);
function githubDialog(){
  const c=cfg();
  showModal('Đồng bộ GitHub',`<label>Owner<input id="gowner" value="${c.owner||'kendevill'}"></label><label>Repository<input id="grepo" value="${c.repo||'chamcong-data'}"></label><label>Branch<input id="gbranch" value="${c.branch||'main'}"></label><label>File dữ liệu<input id="gpath" value="${c.path||'data.json'}"></label><label>Fine-grained token<input id="gtoken" type="password" value="${c.token||''}" placeholder="Token chỉ lưu trong trình duyệt này"></label><small>Token cần quyền Contents: Read and write cho repo dữ liệu. Bấm Lưu sẽ kiểm tra token và tải data.json ngay.</small>`,async()=>{
    localStorage.setItem('github_cfg',JSON.stringify({owner:$('#gowner').value.trim(),repo:$('#grepo').value.trim(),branch:$('#gbranch').value.trim(),path:$('#gpath').value.trim(),token:$('#gtoken').value.trim()}));
    lastRemoteSha='';localStorage.removeItem('chamcong_remote_sha');updateSync(); setTimeout(()=>pull(),0);
  })
}
function updateSync(){$('#syncState').textContent=cfg().token?`GitHub: ${cfg().owner}/${cfg().repo}/${cfg().path||'data.json'}`:'Dữ liệu cục bộ • chưa cấu hình GitHub'}
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$('#'+b.dataset.view).classList.add('active');renderAll()});
$('#prev').onclick=()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar()};$('#next').onclick=()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar()};$('#today').onclick=()=>{selected=new Date();calDate=new Date();renderCalendar();renderDay()};$$('[data-action]').forEach(b=>b.onclick=()=>addAttendance(b.dataset.action));$('#deleteBtn').onclick=editAttendanceDialog
for(let i=1;i<=12;i++)$('#month').add(new Option(i,i));for(let y=new Date().getFullYear()-5;y<=new Date().getFullYear()+5;y++)$('#year').add(new Option(y,y));$('#month').value=month;$('#year').value=year;$('#month').onchange=()=>{month=+$('#month').value;renderAll()};$('#year').onchange=()=>{year=+$('#year').value;renderAll()};$('#bonus').onchange=renderAll;$('#addEmp').onclick=()=>{if(data.Employees.length>=5)return alert('App giới hạn tối đa 5 người.');let e=newEmp();e.Code=`NV${String(data.Employees.length+1).padStart(2,'0')}`;employeeDialog(e,true)};
$('#rulesForm').onsubmit=e=>{e.preventDefault();new FormData(e.target).forEach((v,k)=>data.Settings[k]=+v);saveLocal();autoPush();alert('Đã lưu quy tắc.')};$('#settingsBtn').onclick=githubDialog;$('#syncBtn').onclick=pull;
$('#exportJson').onclick=()=>download('chamcong-backup.json',JSON.stringify(data,null,2),'application/json');$('#importJson').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let d=JSON.parse(await f.text());data=d;data.Settings={...defaults,...data.Settings};current=data.Employees[0];saveLocal();autoPush()}catch{alert('File JSON không hợp lệ.')}};
function download(name,text,type='text/plain'){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
// XLSX OpenXML thuần JS: một sheet mỗi nhân viên, hoạt động cả offline.
function exportPayrollExcel(){
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const col=n=>{let r='';for(n++;n;n=Math.floor((n-1)/26))r=String.fromCharCode(65+(n-1)%26)+r;return r};
 const cell=(v,row,c)=>{const ref=col(c)+row;return typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`};
 const sheet=rows=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="33" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="44" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/></cols><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,i+1,j)).join('')}</row>`).join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells></worksheet>`;
 const entries=[],enc=new TextEncoder();const add=(name,content)=>entries.push({name,bytes:enc.encode(content)});
 const emps=[...data.Employees].sort((a,b)=>String(a.Code).localeCompare(String(b.Code)));
 if(!emps.length)return alert('Chưa có nhân viên để xuất Excel.');
 const sheets=[];
 emps.forEach((e,i)=>{
 const rs=rowsFor(e).slice().sort((a,b)=>new Date(a.Date)-new Date(b.Date));const v=salary(e,rs,month,year,$('#bonus').checked);
 const st=data.Settings, sd=+st.StandardDays||26, base=+e.SalaryBase||0, otBase=+e.OvertimeBase||0;
 const hourly=otBase/sd/8;
 const H={day:0,sun:0,extra:0,night150:0,night215:0,sunNight:0};
 for(const r of rs){const d=new Date(r.Date),sun=d.getDay()===0,night=shiftVal(r.Shift)==='Night',t=typeVal(r.Type);let h=+r.OvertimeHours||0;
  if(t!==0&&t!==2)continue;
  if(sun){if(t===0&&!h)h=+st.SundayDefaultHours||11;if(night)H.sunNight+=h;else H.sun+=h}
  else {if(t===0&&night)H.extra+=+st.NightExtraHours||6;
   if(night){H.night150+=Math.min(h,2);H.night215+=Math.max(0,h-2)}else H.day+=h}
 }
 const amount=(hours,rate)=>hours*hourly*rate;
 const totalOt=v.DayOtPay+v.NightOtPay+v.NightExtraPay+v.SundayDayPay+v.SundayNightPay;
 const rows=[
 [`Lương Tháng ${month}/${year}`],
 [`Họ Và Tên: ${e.Name}`,'',`Số Thẻ: ${e.Code}`],
 ['ngày công tiêu chuẩn',sd,'số giờ tăng ca ngày thường 150%',H.day],
 ['ngày công thực tế',v.PaidDays,'số tiền tăng ca ngày thường',amount(H.day,+st.NormalOvertimeRate||1.5)],
 ['tổng lương tháng',base,'số giờ tăng ca Chủ nhật 200%',H.sun],
 ['lương tính tăng ca',otBase,'số tiền tăng ca Chủ nhật',amount(H.sun,+st.SundayDayRate||2)],
 ['số tiền tăng ca mỗi giờ',hourly,'số giờ tăng ca đêm cộng thêm 30%',H.extra],
 ['tiền chuyên cần',v.AttendanceBonus,'số tiền tăng ca đêm cộng thêm 30%',amount(H.extra,+st.NightExtraRate||.3)],
 ['lương theo ngày công',v.BasePay,'số giờ tăng ca đêm thường 150%',H.night150],
 ['','','số tiền tăng ca đêm thường 150%',amount(H.night150,+st.NormalOvertimeRate||1.5)],
 ['','','số giờ tăng ca đêm thường 215%',H.night215],
 ['','','số tiền tăng ca đêm thường 215%',amount(H.night215,+st.NightOvertimeAfter2Rate||2.15)],
 ['','','số giờ tăng ca đêm Chủ nhật 280%',H.sunNight],
 ['','','số tiền tăng ca đêm Chủ nhật',amount(H.sunNight,+st.SundayNightRate||2.8)],
 ['','','Tổng Tiền Tăng Ca',totalOt],
 [],
 ['','','BẢO HIỂM 10,5%',v.Insurance],
 ['','','công đoàn phí 0,5%',v.UnionFee],
 [],[],
 ['','','Tổng Lương',v.Gross],
 ['','','Thực Lĩnh',v.Net]
 ];
 add(`xl/worksheets/sheet${i+1}.xml`,sheet(rows));sheets.push({name:String(e.Code||'NV').replace(/[\\/*?:\[\]]/g,'_').slice(0,31)||`NV${i+1}`,i:i+1});
 });
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 add('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(x=>`<sheet name="${esc(x.name)}" sheetId="${x.i}" r:id="rId${x.i}"/>`).join('')}</sheets></workbook>`);
 add('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map(x=>`<Relationship Id="rId${x.i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${x.i}.xml"/>`).join('')}</Relationships>`);
 add('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 add('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map(x=>`<Override PartName="/xl/worksheets/sheet${x.i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
 const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0};
 const u16=(a,n)=>{a.push(n&255,(n>>>8)&255)},u32=(a,n)=>{u16(a,n);u16(a,n>>>16)};
 const chunks=[],central=[];let offset=0;
 for(const f of entries){const name=enc.encode(f.name),size=f.bytes.length,sum=crc(f.bytes),local=[];
 u32(local,0x04034b50);u16(local,20);u16(local,0x800);u16(local,0);u16(local,0);u16(local,0);u32(local,sum);u32(local,size);u32(local,size);u16(local,name.length);u16(local,0);
 chunks.push(new Uint8Array(local),name,f.bytes);const cd=[];u32(cd,0x02014b50);u16(cd,20);u16(cd,20);u16(cd,0x800);u16(cd,0);u16(cd,0);u16(cd,0);u32(cd,sum);u32(cd,size);u32(cd,size);u16(cd,name.length);u16(cd,0);u16(cd,0);u16(cd,0);u16(cd,0);u32(cd,0);u32(cd,offset);central.push(new Uint8Array(cd),name);offset+=local.length+name.length+size;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0),tail=[];u32(tail,0x06054b50);u16(tail,0);u16(tail,0);u16(tail,entries.length);u16(tail,entries.length);u32(tail,centralSize);u32(tail,offset);u16(tail,0);
 const blob=new Blob([...chunks,...central,new Uint8Array(tail)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`BangLuong_Thang_${String(month).padStart(2,'0')}${year}.xlsx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$('#exportExcel').onclick=exportPayrollExcel
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('vi-VN'),1000);$('#clock').textContent=new Date().toLocaleTimeString('vi-VN');applyLeave();renderAll();setTimeout(checkRemote,500);
