-- Thêm trạng thái "done" (đã làm xong) cho lịch hẹn.
-- Lịch done không còn bị tính trong ràng buộc chống trùng giờ (chỉ confirmed/arrived bị tính).
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'arrived', 'cancelled', 'no_show', 'done'));
