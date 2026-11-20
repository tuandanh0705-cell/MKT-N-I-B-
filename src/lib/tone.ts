export type ToneMode = "PIRATE" | "GENZ" | "OFFICE";

export interface ToneCopy {
  mode: ToneMode;
  label: string;
  badge: string;
  greetingPrefix: string;
  myWorkTitle: string;
  leaderDeckTitle: string;
  assignBtnLabel: string;
  urgentSectionLabel: string;
  activeSectionLabel: string;
  doneSectionLabel: string;
  emptyTasksMessage: string;
  deleteConfirmTitle: string;
  deleteConfirmQuestion: (itemName: string) => string;
  deleteConfirmButton: string;
  restoreNote: string;
}

export const TONE_OPTIONS: {
  mode: ToneMode;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    mode: "PIRATE",
    label: "Hải Tặc Mũ Rơm",
    emoji: "🏴‍☠️",
    desc: "Ra khơi, Kho báu, Gặp bão, Thousand Sunny",
  },
  {
    mode: "GENZ",
    label: "Gen Z Chữa Lành",
    emoji: "⚡",
    desc: "Hài hước, nhẹ nhàng, bớt áp lực deadline",
  },
  {
    mode: "OFFICE",
    label: "Công Sở Chuẩn Chỉnh",
    emoji: "💼",
    desc: "Chuyên nghiệp, gọn gàng khi họp đối tác",
  },
];

export const ICON_PRESETS = [
  "🏴‍☠️",
  "👒",
  "⚔️",
  "🧭",
  "🔥",
  "⚡",
  "✨",
  "🍓",
  "🚀",
  "💎",
  "🎬",
  "🎨",
  "🧠",
  "🍀",
];

export function getToneCopy(mode?: string | null): ToneCopy {
  const safeMode: ToneMode =
    mode === "GENZ" || mode === "OFFICE" ? mode : "PIRATE";

  if (safeMode === "GENZ") {
    return {
      mode: "GENZ",
      label: "Gen Z Chữa Lành",
      badge: "⚡ Vibes Gen Z",
      greetingPrefix: "Hé lô đồng môn",
      myWorkTitle: "Bảng Việc Hôm Nay • Cày Nhẹ Không Quạo",
      leaderDeckTitle: "Trạm Điều Phối Vibes Toàn Team",
      assignBtnLabel: "+ Giao kèo mới",
      urgentSectionLabel: "🔥 Deadline Gõ Cửa / Cần Chỉnh Gấp",
      activeSectionLabel: "🚀 Đang Chạy / Chờ Sếp Gật Đầu",
      doneSectionLabel: "✨ Đỉnh Nóc Kịch Trần • Đã Xong",
      emptyTasksMessage:
        "Trống trơn luôn á — uống ngụm trà sữa rồi chill nhẹ hoặc xin thêm kèo đi nè!",
      deleteConfirmTitle: "Ê khoan dừng lại chừng 2 giây!",
      deleteConfirmQuestion: (itemName) =>
        `Mày có chắc chắn muốn xóa "${itemName}" không đó?`,
      deleteConfirmButton: "Chốt xóa luôn",
      restoreNote:
        "Đừng lo: Công việc sẽ được cất vào Thùng rác 30 ngày, lỡ tay vẫn cứu lại được nha!",
    };
  }

  if (safeMode === "OFFICE") {
    return {
      mode: "OFFICE",
      label: "Công Sở Chuẩn Chỉnh",
      badge: "💼 Standard Mode",
      greetingPrefix: "Xin chào",
      myWorkTitle: "Danh Sách Công Việc Cá Nhân",
      leaderDeckTitle: "Bảng Điều Hành Marketing Hub",
      assignBtnLabel: "+ Tạo công việc mới",
      urgentSectionLabel: "Ưu tiên cao / Quá hạn / Cần chỉnh sửa",
      activeSectionLabel: "Đang thực hiện / Chờ phê duyệt",
      doneSectionLabel: "Đã phê duyệt / Hoàn thành",
      emptyTasksMessage: "Hiện tại không có công việc nào được giao.",
      deleteConfirmTitle: "Xác nhận thao tác xóa",
      deleteConfirmQuestion: (itemName) =>
        `Bạn có chắc chắn muốn xóa "${itemName}" khỏi danh sách hiện hành không?`,
      deleteConfirmButton: "Xác nhận xóa",
      restoreNote:
        "Mục đã xóa sẽ được chuyển vào Thùng rác để có thể khôi phục khi cần.",
    };
  }

  return {
    mode: "PIRATE",
    label: "Hải Tặc Mũ Rơm",
    emoji: "🏴‍☠️",
    badge: "⛵ Băng Mũ Rơm",
    greetingPrefix: "Chào thuyền viên",
    myWorkTitle: "Nhật Ký Hải Trình Cá Nhân",
    leaderDeckTitle: "Boong Tàu Thuyền Trưởng",
    assignBtnLabel: "+ Phát lệnh mới",
    urgentSectionLabel: "🌊 Cần xử lý gấp — Quá hạn / Vá buồm",
    activeSectionLabel: "⛵ Đang ra khơi / Chờ Thuyền trưởng duyệt",
    doneSectionLabel: "🏆 Đã duyệt / Cập bến thành công",
    emptyTasksMessage:
      "Biển êm gió lặng — hiện tại bạn chưa có nhiệm vụ nào trên boong.",
    deleteConfirmTitle: "Khoan đã thuyền viên!",
    deleteConfirmQuestion: (itemName) =>
      `Mày có muốn xóa "${itemName}" không đấy? Kiểm tra kỹ trước khi ném xuống biển nha!`,
    deleteConfirmButton: "Chắc chắn xóa",
    restoreNote:
      "Công việc sẽ trôi vào Thùng rác 30 ngày để Thuyền trưởng có thể vớt lại nếu cần.",
  } as ToneCopy;
}

export const DEFAULT_MOTIVATIONAL_QUOTES: {
  content: string;
  authorLabel: string;
  tone: string;
}[] = [
  {
    content:
      "Dù sóng gió Đại Hải Trình có lớn đến đâu, cả băng đồng lòng là tới được Kho báu KPI!",
    authorLabel: "Thuyền trưởng Luffy",
    tone: "PIRATE",
  },
  {
    content:
      "Không có bài content nào quá khó, chỉ có hook chưa đủ cháy thôi. Lên nhạc viết tiếp nào!",
    authorLabel: "Nhà khảo cổ Nico Robin",
    tone: "ALL",
  },
  {
    content:
      "Deadline chỉ đáng sợ khi mình né nó. Chốt 1 gạch đầu dòng trước là xong được 50% rồi!",
    authorLabel: "Hoa tiêu Nami",
    tone: "GENZ",
  },
  {
    content:
      "Một video 30 giây triệu view bắt đầu từ 3 giây đầu tiên thật sự chạm đúng nỗi đau khách hàng.",
    authorLabel: "Xạ thủ Usopp",
    tone: "ALL",
  },
  {
    content:
      "Đừng sợ sửa bản nháp — mỗi lần feedback là một lần nâng cấp vũ khí từ cấp Thường lên Legend!",
    authorLabel: "Kiếm sĩ Zoro",
    tone: "PIRATE",
  },
  {
    content:
      "Uống miếng nước, vươn vai cái nhẹ rồi xử gọn từng việc một nha đồng đội ơi!",
    authorLabel: "Bác sĩ Chopper",
    tone: "GENZ",
  },
  {
    content:
      "Kỷ luật tốt tạo nên tự do sáng tạo. Đúng lịch, rõ brief, cả team nhẹ đầu hẳn!",
    authorLabel: "Meta Ecom MKT Hub",
    tone: "OFFICE",
  },
  {
    content:
      "SUPER!! Hôm nay quay dựng mượt mà, file drive gọn gàng, sếp duyệt cái rụp!",
    authorLabel: "Thợ đóng tàu Franky",
    tone: "PIRATE",
  },
];
