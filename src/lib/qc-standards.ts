export interface QcCriterion {
  code: string;
  category: "IMAGE_CONTENT" | "VIDEO";
  owner: string;
  group: string;
  detail: string;
}

/**
 * Bộ tiêu chuẩn kiểm duyệt đầu ra lấy trực tiếp từ tab "Yêu cầu Output"
 * - 26 tiêu chuẩn Ảnh / Content / Final ấn phẩm
 * - 40 lỗi cần kiểm tra cho Video / Kịch bản / Editor
 */
export const QC_CRITERIA: QcCriterion[] = [
  // === 26 TIÊU CHUẨN ẢNH & CONTENT ===
  { code: "IMG-01", category: "IMAGE_CONTENT", owner: "Design", group: "Logo", detail: "Đúng logo gốc, tỷ lệ, vị trí, khoảng cách an toàn và Brand Guideline; không tự ý sửa logo." },
  { code: "IMG-02", category: "IMAGE_CONTENT", owner: "Design", group: "Text trên ảnh", detail: "Không sai chữ, thiếu chữ, lỗi font, lỗi dấu tiếng Việt; khớp bản đã duyệt, đủ tương phản." },
  { code: "IMG-03", category: "IMAGE_CONTENT", owner: "Design", group: "Brand Identity", detail: "Đúng màu thương hiệu, mascot, font, icon và hệ thống nhận diện." },
  { code: "IMG-04", category: "IMAGE_CONTENT", owner: "Design", group: "Hình ảnh & bản quyền", detail: "Ảnh có quyền sử dụng; không dùng ảnh người thật trái phép; không lỗi tách nền hoặc lỗi AI." },
  { code: "IMG-05", category: "IMAGE_CONTENT", owner: "Design", group: "Bố cục hình ảnh", detail: "Căn lề, khoảng cách, phân cấp thông tin, tỷ lệ và khoảng trắng hợp lý." },
  { code: "IMG-06", category: "IMAGE_CONTENT", owner: "Design", group: "Chất lượng hình ảnh", detail: "Không vỡ nét, mờ, méo hình, sai tỷ lệ hoặc có chi tiết thừa." },
  { code: "IMG-07", category: "IMAGE_CONTENT", owner: "Content + Design", group: "Caption & Visual", detail: "Nội dung caption và hình ảnh thống nhất, không sai lệch thông điệp." },
  { code: "IMG-08", category: "IMAGE_CONTENT", owner: "Content + Design", group: "Nội dung AI", detail: "Kiểm tra dữ kiện AI tạo ra, lỗi hình ảnh, nội dung giả và chi tiết gây hiểu lầm." },
  { code: "IMG-09", category: "IMAGE_CONTENT", owner: "Content", group: "Chính tả", detail: "Không sai dấu câu, viết hoa, từ ngữ, ngữ pháp hoặc lỗi diễn đạt." },
  { code: "IMG-10", category: "IMAGE_CONTENT", owner: "Content", group: "Độ chính xác", detail: "Kiểm chứng tên thương hiệu, sản phẩm, số liệu, chức danh, ngày tháng và thông tin công bố." },
  { code: "IMG-11", category: "IMAGE_CONTENT", owner: "Content", group: "Mục tiêu bài viết", detail: "Có mục tiêu rõ: nhận diện, giáo dục, tương tác, lead hoặc chuyển đổi." },
  { code: "IMG-12", category: "IMAGE_CONTENT", owner: "Content", group: "Đúng đối tượng", detail: "Phù hợp chân dung khách hàng, nhu cầu và giai đoạn nhận thức." },
  { code: "IMG-13", category: "IMAGE_CONTENT", owner: "Content", group: "Bố cục bài viết", detail: "Mở bài, thân bài, kết luận/CTA rõ ràng; ngắt đoạn dễ đọc trên mobile; Hook đúng trọng tâm." },
  { code: "IMG-14", category: "IMAGE_CONTENT", owner: "Content", group: "Giá trị nội dung", detail: "Có insight, thông tin hữu ích, hướng dẫn, giải pháp hoặc lợi ích cụ thể." },
  { code: "IMG-15", category: "IMAGE_CONTENT", owner: "Content", group: "Giọng thương hiệu", detail: "Đúng Tone of Voice, không sử dụng ngôn từ lệch định vị." },
  { code: "IMG-16", category: "IMAGE_CONTENT", owner: "Content", group: "CTA", detail: "Rõ ràng, phù hợp mục tiêu, không ép bán hàng vào mọi bài." },
  { code: "IMG-17", category: "IMAGE_CONTENT", owner: "Content", group: "Nguồn thông tin", detail: "Có nguồn xác thực cho số liệu, nghiên cứu, chính sách và thông tin cần kiểm chứng." },
  { code: "IMG-18", category: "IMAGE_CONTENT", owner: "Content", group: "Tính Pháp lý", detail: "Không vi phạm bản quyền, quy định quảng cáo, bảo mật hoặc quy định ngành." },
  { code: "IMG-19", category: "IMAGE_CONTENT", owner: "Content", group: "Hashtag", detail: "Liên quan chủ đề, đúng thương hiệu, không spam." },
  { code: "IMG-20", category: "IMAGE_CONTENT", owner: "Content", group: "Link", detail: "Link hoạt động, đúng landing page, CTA và UTM nếu có." },
  { code: "IMG-21", category: "IMAGE_CONTENT", owner: "Content", group: "Tin tức Nhà nước", detail: "Đúng cơ quan ban hành, số văn bản, nội dung, ngày hiệu lực và nguồn chính thức." },
  { code: "IMG-22", category: "IMAGE_CONTENT", owner: "Content", group: "Số liệu & Case Study", detail: "Không bịa số liệu, kết quả, feedback; số liệu cần được confirm trước khi đăng." },
  { code: "IMG-23", category: "IMAGE_CONTENT", owner: "Final ấn phẩm", group: "Định dạng đăng", detail: "Đúng kích thước, tỷ lệ, thứ tự ảnh, thumbnail và yêu cầu nền tảng." },
  { code: "IMG-24", category: "IMAGE_CONTENT", owner: "Final ấn phẩm", group: "Lịch đăng", detail: "Đúng fanpage, dự án, ngày giờ, phiên bản nội dung và trạng thái duyệt." },
  { code: "IMG-25", category: "IMAGE_CONTENT", owner: "Final ấn phẩm", group: "Bảo mật", detail: "Không lộ dữ liệu nội bộ, thông tin khách hàng, tài liệu chưa được phép công bố." },
  { code: "IMG-26", category: "IMAGE_CONTENT", owner: "Final ấn phẩm", group: "Final Approval", detail: "Caption, visual/video, link và nguồn đã được duyệt cuối cùng trước D-1." },

  // === 40 LỖI CẦN KIỂM TRA VIDEO ===
  { code: "VID-01", category: "VIDEO", owner: "Content", group: "Kịch bản", detail: "Kịch bản thiếu mở đầu, thân bài, kết luận; nội dung lan man, thiếu logic." },
  { code: "VID-02", category: "VIDEO", owner: "Content", group: "Độ chính xác", detail: "Sai tên, số liệu, tính năng, giá, chức danh, ngày tháng, tin tức." },
  { code: "VID-03", category: "VIDEO", owner: "Content", group: "CTA", detail: "CTA không rõ ràng, thiếu CTA hoặc không phù hợp mục tiêu video." },
  { code: "VID-04", category: "VIDEO", owner: "Content", group: "Brief", detail: "Brief kịch bản không đầy đủ source, cảnh quay, lời thoại, thời lượng, reference." },
  { code: "VID-05", category: "VIDEO", owner: "Content", group: "Caption", detail: "Caption và video không đồng nhất nội dung, thông tin hoặc CTA." },
  { code: "VID-06", category: "VIDEO", owner: "Content", group: "Thông điệp", detail: "Video không có thông điệp chính hoặc truyền tải sai mục tiêu." },
  { code: "VID-07", category: "VIDEO", owner: "Content", group: "Hook", detail: "Thiếu hook, mở đầu dài, không thu hút hoặc không đúng insight khách hàng." },
  { code: "VID-08", category: "VIDEO", owner: "Content", group: "Nguồn tin tức", detail: "Thiếu nguồn, sai nguồn, trích dẫn sai hoặc dùng tin đã lỗi thời." },
  { code: "VID-09", category: "VIDEO", owner: "Content", group: "Pháp lý", detail: "Video có claim không được chứng minh, thông tin sai hoặc vi phạm quy định ngành." },
  { code: "VID-10", category: "VIDEO", owner: "Content + Editor", group: "Source", detail: "Thiếu source quay, footage, ảnh, tài liệu hoặc link tham chiếu." },
  { code: "VID-11", category: "VIDEO", owner: "Content + Editor", group: "Voice", detail: "Voice sai nội dung, sai phát âm, ngắt nghỉ không tự nhiên, thiếu câu hoặc lỗi giọng AI." },
  { code: "VID-12", category: "VIDEO", owner: "Content + Editor", group: "Thumbnail", detail: "Thiếu thumbnail, thumbnail sai nội dung, không hấp dẫn hoặc sai nhận diện." },
  { code: "VID-13", category: "VIDEO", owner: "Content + Editor", group: "Thời lượng", detail: "Video quá dài, lan man hoặc không đúng thời lượng trong brief." },
  { code: "VID-14", category: "VIDEO", owner: "Content + Editor", group: "Bản quyền hình ảnh", detail: "Dùng footage, ảnh người thật, hình ảnh khách hàng chưa có quyền sử dụng." },
  { code: "VID-15", category: "VIDEO", owner: "Content + Editor", group: "Sản phẩm", detail: "Hiển thị sai sản phẩm, giao diện, tính năng, tên hoặc phiên bản." },
  { code: "VID-16", category: "VIDEO", owner: "Content + Editor", group: "Tính nhất quán", detail: "Video, caption, thumbnail, logo và CTA không thống nhất." },
  { code: "VID-17", category: "VIDEO", owner: "Editor", group: "Outro", detail: "Thiếu outro, kết thúc đột ngột hoặc sai mẫu outro thương hiệu." },
  { code: "VID-18", category: "VIDEO", owner: "Editor", group: "Logo", detail: "Thiếu logo, sai logo, sai vị trí, sai tỷ lệ, logo mờ hoặc bị kéo giãn." },
  { code: "VID-19", category: "VIDEO", owner: "Editor", group: "Text", detail: "Lỗi auto-caption, sai chính tả, lỗi font, sai thông tin, mất dấu tiếng Việt." },
  { code: "VID-20", category: "VIDEO", owner: "Editor", group: "Bản quyền nhạc", detail: "Sử dụng nhạc không có quyền phù hợp hoặc vi phạm điều kiện sử dụng." },
  { code: "VID-21", category: "VIDEO", owner: "Editor", group: "Cảnh quay", detail: "Thiếu cảnh, sai cảnh, cảnh không đúng nội dung kịch bản." },
  { code: "VID-22", category: "VIDEO", owner: "Editor", group: "B-roll", detail: "B-roll không liên quan, lặp cảnh quá nhiều, gây hiểu lầm." },
  { code: "VID-23", category: "VIDEO", owner: "Editor", group: "Chất lượng hình", detail: "Video mờ, vỡ nét, rung, thiếu sáng hoặc sai màu." },
  { code: "VID-24", category: "VIDEO", owner: "Editor", group: "Âm thanh", detail: "Âm thanh rè, nhiễu, quá nhỏ, quá lớn hoặc mất tiếng." },
  { code: "VID-25", category: "VIDEO", owner: "Editor", group: "Nhạc nền", detail: "Nhạc quá to lấn voice, sai cảm xúc hoặc chuyển nhạc đột ngột." },
  { code: "VID-26", category: "VIDEO", owner: "Editor", group: "Subtitle", detail: "Phụ đề lệch voice, chạy quá nhanh, sai thời điểm hoặc khó đọc." },
  { code: "VID-27", category: "VIDEO", owner: "Editor", group: "Bố cục", detail: "Text che mặt, che sản phẩm, bố cục rối, chủ thể bị cắt." },
  { code: "VID-28", category: "VIDEO", owner: "Editor", group: "Brand", detail: "Sai màu thương hiệu, font, mascot, icon hoặc phong cách nhận diện." },
  { code: "VID-29", category: "VIDEO", owner: "Editor", group: "Chuyển cảnh", detail: "Chuyển cảnh giật, không mượt, hiệu ứng thừa hoặc thiếu logic." },
  { code: "VID-30", category: "VIDEO", owner: "Editor", group: "Motion", detail: "Animation lỗi, text xuất hiện sai thời điểm, hiệu ứng bị giật." },
  { code: "VID-31", category: "VIDEO", owner: "Editor", group: "Tách nền", detail: "Viền nham nhở, halo trắng, mất tóc, mất tay hoặc lỗi mask." },
  { code: "VID-32", category: "VIDEO", owner: "Editor", group: "AI Visual", detail: "Hình ảnh/video AI lỗi tay, mặt, miệng, chữ, vật thể hoặc chuyển động." },
  { code: "VID-33", category: "VIDEO", owner: "Editor", group: "Đồng bộ hình - tiếng", detail: "Hình ảnh, lời thoại, voice và phụ đề không khớp nhau." },
  { code: "VID-34", category: "VIDEO", owner: "Editor", group: "Khung hình", detail: "Sai tỷ lệ 9:16, 1:1, 16:9 hoặc không phù hợp nền tảng." },
  { code: "VID-35", category: "VIDEO", owner: "Editor", group: "Safe Zone", detail: "Text, logo, CTA bị che bởi giao diện TikTok, Reels hoặc Shorts." },
  { code: "VID-36", category: "VIDEO", owner: "Editor", group: "Kết thúc", detail: "Video bị cắt hụt câu, thiếu frame cuối hoặc có màn hình đen." },
  { code: "VID-37", category: "VIDEO", owner: "Editor", group: "Export", detail: "Sai độ phân giải, FPS, định dạng, codec hoặc chất lượng xuất file." },
  { code: "VID-38", category: "VIDEO", owner: "Editor", group: "File lỗi", detail: "File không mở được, mất âm thanh, đứng hình hoặc xuất thiếu đoạn." },
  { code: "VID-39", category: "VIDEO", owner: "Editor", group: "Version", detail: "Gửi nhầm version, dùng bản cũ hoặc chưa sửa hết feedback." },
  { code: "VID-40", category: "VIDEO", owner: "Editor", group: "Kiểm tra final", detail: "Không xem lại toàn bộ video sau khi export trước khi gửi Leader." },
];

export function getQcCriteriaForTaskType(taskType: string): QcCriterion[] {
  const isVideo = taskType === "MEDIA_VIDEO";
  return QC_CRITERIA.filter((item) =>
    isVideo ? item.category === "VIDEO" : item.category === "IMAGE_CONTENT"
  );
}
