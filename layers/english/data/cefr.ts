/**
 * Data tĩnh: 6 band CEFR + bảng quy đổi sang IELTS, TOEIC (L&R), TOEFL iBT, Cambridge.
 *
 * Mapping đã đối chiếu bảng chuyển đổi phổ biến (Cambridge English scale ↔ IELTS/TOEFL/TOEIC).
 * Nếu cần update, chỉnh ở đây — component chỉ đọc, không hardcode số liệu.
 */
import type { CefrBand } from '#shared/schemas/english'

export interface CefrBandInfo {
  code: CefrBand
  /** Tên tiếng Anh chuẩn (Beginner, Elementary, ...). */
  name: string
  /** Mô tả 1 dòng tiếng Việt cho card header. */
  description: string
  /** Can-do statements — 3–4 gạch đầu dòng, giọng ngắn gọn. */
  canDo: string[]
  /** Quy đổi sang các hệ tham chiếu phổ biến; undefined = không có mapping ở band này. */
  scores: {
    ielts?: string
    toeic?: string
    toeflIbt?: string
    cambridge?: string
  }
  /** Tailwind gradient stops (from- ... to- ...) — gradient từ neutral → vibrant theo level. */
  gradient: string
  /** Semantic color key cho UBadge / accent. */
  accent: 'neutral' | 'info' | 'primary' | 'success' | 'warning' | 'error'
}

export const CEFR_BAND_INFOS: readonly CefrBandInfo[] = [
  {
    code: 'A1',
    name: 'Beginner',
    description: 'Giao tiếp cơ bản nhất, tình huống rất quen thuộc.',
    canDo: [
      'Hiểu và dùng cụm từ đơn giản để đáp ứng nhu cầu cụ thể.',
      'Tự giới thiệu, hỏi thông tin cá nhân cơ bản (tên, nơi ở, sở thích).',
      'Giao tiếp đơn giản khi người đối thoại nói chậm, rõ ràng.',
      'Đọc được biển báo, menu, thời gian biểu ngắn.',
    ],
    scores: { toeic: '120–224', cambridge: '100–119' },
    gradient: 'from-slate-500 to-slate-600',
    accent: 'neutral',
  },
  {
    code: 'A2',
    name: 'Elementary',
    description: 'Xử lý được tình huống quen thuộc, câu ngắn.',
    canDo: [
      'Hiểu câu và cụm từ phổ biến về gia đình, mua sắm, công việc.',
      'Trao đổi ngắn về chủ đề quen thuộc, thường ngày.',
      'Viết ghi chú, tin nhắn ngắn về nhu cầu trước mắt.',
      'Đọc email ngắn, giới thiệu sản phẩm đơn giản.',
    ],
    scores: { toeic: '225–549', cambridge: '120–139' },
    gradient: 'from-sky-500 to-cyan-500',
    accent: 'info',
  },
  {
    code: 'B1',
    name: 'Intermediate',
    description: 'Độc lập trong các chủ đề quen thuộc.',
    canDo: [
      'Xử lý hầu hết tình huống khi du lịch ở nước dùng tiếng Anh.',
      'Trình bày ngắn gọn lý do, quan điểm về kế hoạch cá nhân.',
      'Viết đoạn văn liền mạch về chủ đề quen thuộc hoặc quan tâm.',
      'Hiểu ý chính của tin tức radio/TV khi nói chậm và rõ.',
    ],
    scores: { ielts: '4.0–5.0', toeic: '550–784', toeflIbt: '42–71', cambridge: '140–159' },
    gradient: 'from-teal-500 to-emerald-500',
    accent: 'success',
  },
  {
    code: 'B2',
    name: 'Upper-Intermediate',
    description: 'Tranh luận và làm việc trong môi trường tiếng Anh.',
    canDo: [
      'Hiểu ý chính của văn bản phức tạp cả về chủ đề cụ thể lẫn trừu tượng.',
      'Giao tiếp trôi chảy với người bản xứ mà không gây căng thẳng cho hai phía.',
      'Viết văn bản chi tiết, rõ ràng về nhiều chủ đề khác nhau.',
      'Bảo vệ quan điểm bằng lập luận có tổ chức.',
    ],
    scores: { ielts: '5.5–6.5', toeic: '785–944', toeflIbt: '72–94', cambridge: '160–179' },
    gradient: 'from-indigo-500 to-purple-500',
    accent: 'primary',
  },
  {
    code: 'C1',
    name: 'Advanced',
    description: 'Thành thạo trong học thuật và công việc chuyên môn.',
    canDo: [
      'Hiểu văn bản dài, khó và nhận ra hàm ý ngầm.',
      'Diễn đạt trôi chảy, tự nhiên mà không phải rõ ràng tìm từ.',
      'Dùng ngôn ngữ linh hoạt trong công việc, học thuật, xã hội.',
      'Viết văn bản có cấu trúc rõ, đủ chi tiết về chủ đề phức tạp.',
    ],
    scores: { ielts: '7.0–8.0', toeic: '945–990', toeflIbt: '95–120', cambridge: '180–199' },
    gradient: 'from-amber-500 to-orange-500',
    accent: 'warning',
  },
  {
    code: 'C2',
    name: 'Proficiency',
    description: 'Gần như người bản xứ, xử lý sắc thái tinh tế.',
    canDo: [
      'Hiểu gần như mọi thứ nghe hoặc đọc mà không cần cố gắng.',
      'Tóm tắt thông tin từ nhiều nguồn, tái cấu trúc mạch lạc.',
      'Diễn đạt tự nhiên, chính xác, phân biệt sắc thái tinh tế.',
      'Dùng ngôn ngữ ở ngữ cảnh học thuật và chuyên môn cao.',
    ],
    scores: { ielts: '8.5–9.0', cambridge: '200–230' },
    gradient: 'from-fuchsia-500 to-rose-500',
    accent: 'error',
  },
] as const
