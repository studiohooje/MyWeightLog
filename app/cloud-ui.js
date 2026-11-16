import {cloudState} from './cloud-sync.js';
import {scopedKey,storageAccount} from './storage-scope.js';
import {nativeAuthAvailable} from './native-auth.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preview=v=>v===null?'삭제된 기록':v.length>900?v.slice(0,900)+'… (전체 원본은 아래에서 저장)':v;
export function cloudSettingsHTML() {
  const s=cloudState, last=localStorage.getItem(scopedKey('myweightlog.cloud.last-sync'));
  const heading=`<section class="section card"><h3>내 계정과 기록 동기화</h3>`;
  if(s.native&&!nativeAuthAvailable())return heading+'<p>Android 로그인 모듈이 포함된 최신 앱으로 업데이트해 주세요. 현재 버전에서는 로컬 기록과 백업을 사용할 수 있습니다.</p></section>';
  if(!s.configured)return heading+'<p>서버 연결 준비 중입니다. 현재 기록은 이 기기에 안전하게 보관됩니다.</p></section>';
  if(s.error)return heading+`<p>${esc(s.error)}</p><button class="button secondary" id="cloud-retry">연결 다시 시도</button></section>`;
  if(!s.user)return heading+`<p>Google 로그인 후 기록 이용을 신청할 수 있습니다. 승인 전에는 서버에 건강 기록이 저장되지 않습니다. 게스트 기록은 이 기기에 남습니다.</p><button class="button" id="cloud-login">Google로 로그인</button><p class="hint">${s.native?'Android 앱에서는 로그아웃할 때까지 계정이 유지됩니다.':'로그인은 현재 탭 동안 유지됩니다.'}</p></section>`;
  if(s.approval!=='approved'){
    const message={not_applied:'기록 이용 신청 전',pending:'관리자 승인 대기 중',rejected:'기록 이용 신청이 반려됨',unknown:'승인 상태 확인 실패'}[s.approval]||'승인 상태 확인 중';
    const consent=s.approval==='not_applied'?`<div class="alert"><p><strong>기록 이용 신청 안내</strong></p><p>목적: 계정별 체중·체성분·식단·운동 기록 저장과 기기 간 동기화.</p><p>항목: Google 계정 UID·이메일, 입력한 건강 기록과 설정. 사진과 운동 초안은 서버로 보내지 않습니다.</p><p>보유: 이용 중 보관하며 삭제 요청은 관리자에게 접수합니다. 신청 전에는 건강 기록을 서버로 전송하지 않습니다.</p><label class="field"><input type="checkbox" id="approval-consent"> 위 서버 저장 안내를 확인하고 건강 기록 처리에 동의합니다.</label><button class="button" id="cloud-apply">기록 이용 신청</button></div>`:'';
    return heading+`<p><strong>${esc(s.user.email||'현재 계정')}</strong> · ${message}</p>${consent}<p class="hint">승인 전에도 기기 안의 기록과 백업은 사용할 수 있습니다. ${s.approvalError?`상태 확인 오류: ${esc(s.approvalError)}`:''}</p><div class="actions"><button class="button secondary" id="cloud-approval-refresh">상태 새로 확인</button><button class="button secondary" id="cloud-logout">로그아웃</button></div></section>`;
  }
  return heading+`<p><strong>${esc(s.user.email||s.user.displayName||'내 계정')}</strong></p><p class="hint">UID: ${esc(storageAccount())}</p><p>이 계정의 기록 공간입니다. ‘지금 동기화’를 누르면 몸·식단·운동·설정의 숫자와 텍스트를 Firebase에 보내고 다른 기기의 변경을 가져옵니다.</p><p class="hint">사진과 작성 중 운동 초안은 전송하지 않습니다. 삭제도 동기화됩니다. 자동 동기화는 꺼져 있습니다. 마지막 완료: ${last?esc(new Date(last).toLocaleString('ko-KR')):'없음'}</p><div class="actions"><button class="button" id="cloud-sync">지금 동기화</button><button class="button secondary" id="cloud-import-guest">게스트 기록 복사</button><button class="button secondary" id="cloud-logout">로그아웃 · 게스트로</button></div><p class="hint">서버 접근이 거부되면 관리자에게 위 UID 등록을 요청하세요.</p>${s.conflicts.length?`<div class="alert"><h4>같은 기록을 두 기기에서 수정했습니다</h4><p>아직 어떤 변경도 전송하지 않았습니다. 각 기록에서 유지할 내용을 선택해 주세요. 전체 양쪽 원본을 먼저 저장할 수 있습니다.</p><button id="cloud-conflicts-export" class="button secondary">충돌 원본 저장</button>${s.conflicts.map((c,i)=>`<details><summary>${esc(c.key)}</summary><p>이 기기</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(preview(c.local))}</pre><p>서버</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(preview(c.remote))}</pre><label class="field">유지할 내용<select data-cloud-conflict="${i}"><option value="">선택해 주세요</option><option value="local">이 기기 내용 유지</option><option value="remote">서버 내용 유지</option></select></label></details>`).join('')}<button class="button" id="cloud-resolve">선택한 내용으로 동기화</button></div>`:''}<button class="text-button" id="cloud-archive-export">마지막 동기화 직전 원본 저장</button></section>`;
}
export function accountAdminHTML(){
  if(cloudState.user?.uid!=='x65cKbgpsQVk6oj7JIDnLVFDYtN2')return '';
  const rows=cloudState.applicants.map(a=>`<div class="record"><div><strong>${esc(a.email||a.uid)}</strong><small>${esc(a.status||'상태 없음')} · UID ${esc(a.uid)}</small><small>신청 ${a.createdAt?.toDate?esc(a.createdAt.toDate().toLocaleString('ko-KR')):'시간 확인 중'}</small></div><div class="actions"><button type="button" class="button secondary" id="cloud-review-approved-${esc(a.uid)}">승인</button><button type="button" class="button secondary" id="cloud-review-pending-${esc(a.uid)}">대기</button><button type="button" class="button secondary" id="cloud-review-rejected-${esc(a.uid)}">반려</button></div></div>`).join('');
  return `<section class="section card"><h3>기록 이용 신청 관리</h3><p class="hint">승인된 계정만 서버 기록과 공용 도감에 접근합니다. 기존 Firebase Auth 계정은 승인 전에 생성될 수 있습니다.</p><button class="button secondary" id="cloud-applicants-refresh">신청 목록 새로고침</button>${rows||'<p class="hint">신청 목록이 없습니다.</p>'}</section>`;
}
