Tôi cần xây dựng một Landing Page đơn giản bằng React để demo luồng Affiliate Tracking giữa Landing Page, Backend và Demo App.

### 1. Trước khi triển khai

* Kiểm tra source code hiện tại.
* Nếu đã có project React thì sử dụng lại project hiện tại.
* Nếu chưa có thì khởi tạo project React + TypeScript + Vite.
* Đọc các hướng dẫn trong AGENTS.md.
* Kiểm tra API Backend đã được triển khai để tích hợp đúng endpoint, request và response.
* Không tự ý thay đổi API contract của Backend.

### 2. Mục tiêu giao diện

Xây dựng một Landing Page giới thiệu ứng dụng vay tiền, có giao diện hiện đại, chuyên nghiệp, thân thiện với người dùng.

Agent được tự do quyết định:

* Màu sắc chủ đạo.
* Typography.
* Layout.
* Animation và hiệu ứng.
* Icon và hình minh họa.
* Responsive cho Mobile và Desktop.

Ưu tiên giao diện Mobile First vì người dùng chủ yếu truy cập Landing Page bằng điện thoại.

Có thể tham khảo phong cách Landing Page của các ứng dụng Fintech hiện đại.

### 3. Luồng nghiệp vụ chính

Khi người dùng truy cập Landing Page:

**Bước 1: Khởi tạo Landing Page**

* Đọc tham số `click_id` từ URL query parameter.
* Nếu URL không có click_id thì tự sinh một UUID mới.
* Lấy thông tin hệ điều hành của thiết bị từ browser User-Agent:

  * IOS
  * ANDROID
* Gọi API Backend để lấy cấu hình Landing Page.

API:

`GET /api/affiliate/config`

Response:

{
"requirePhone": true
}

**Bước 2: Hiển thị giao diện theo cấu hình Backend**

Trường hợp A: `requirePhone = true`

Hiển thị:

* Ô nhập số điện thoại.
* Nút "Tải ứng dụng ngay".

Yêu cầu:

* Số điện thoại là trường bắt buộc.
* Validate số điện thoại trước khi gửi API.
* Hiển thị thông báo lỗi nếu số điện thoại không hợp lệ.

Trường hợp B: `requirePhone = false`

Hiển thị:

* Không hiển thị ô nhập số điện thoại.
* Chỉ hiển thị nút "Tải ứng dụng ngay".

Không yêu cầu người dùng nhập thêm thông tin.

**Bước 3: Khi người dùng nhấn nút tải ứng dụng**

Gọi API:

`POST /api/affiliate/click`

Request:

{
"clickId": "AFF_20261102_00001",
"phone": "856201234567",
"os": "ANDROID"
}

Trong đó:

* clickId: ID lấy từ URL hoặc UUID tự sinh.
* phone: Số điện thoại người dùng nhập. Nếu requirePhone = false thì không gửi hoặc gửi null.
* os: Hệ điều hành của thiết bị.

Lưu ý về IP:

* Ưu tiên để Backend tự xác định IP từ HTTP request.
* Nếu API hiện tại bắt buộc nhận IP trong request body thì kiểm tra và lựa chọn phương án tích hợp phù hợp.
* Không hardcode IP.

Sau khi API ghi nhận click thành công:

* Nếu thiết bị là Android: chuyển hướng đến Google Play.
* Nếu thiết bị là iOS: chuyển hướng đến App Store.

Nếu API thất bại:

* Không tự động chuyển hướng đến Store.
* Hiển thị thông báo lỗi phù hợp.
* Cho phép người dùng thử lại.

Trong lúc gọi API:

* Hiển thị loading trên nút.
* Disable nút để tránh gửi nhiều request.
* Không tạo click_id mới khi người dùng nhấn thử lại.

### 4. Cấu hình đường dẫn Store

Tạo file cấu hình riêng để dễ dàng thay đổi:

* GOOGLE_PLAY_URL
* APP_STORE_URL

Không hardcode URL trực tiếp trong component.

Sử dụng environment variables nếu phù hợp.

Ví dụ:

VITE_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=your.package
VITE_APP_STORE_URL=https://apps.apple.com/app/id000000000

Nếu chưa có URL chính thức thì sử dụng URL demo và ghi chú rõ vị trí cần thay thế.

### 5. Yêu cầu UI/UX

Landing Page nên có các thành phần:

* Header với logo ứng dụng.
* Hero section giới thiệu ứng dụng.
* Tiêu đề và mô tả ngắn gọn.
* Khu vực nhập số điện thoại (chỉ khi requirePhone = true).
* Nút tải ứng dụng nổi bật.
* Một số điểm nổi bật về ứng dụng.
* Footer đơn giản.

Agent được tự do sáng tạo để tạo ra giao diện đẹp, hiện đại và có tính thương mại.

Không cần xây dựng quá nhiều section phức tạp.

### 6. Yêu cầu kỹ thuật

* React + TypeScript.
* Vite.
* Responsive Mobile/Desktop.
* Tách API service riêng.
* Tách component hợp lý.
* Sử dụng environment variables cho API Base URL và Store URL.
* Có loading state.
* Có error state.
* Có validation.
* Không gọi API lặp lại không cần thiết.
* Không để lộ thông tin nhạy cảm.
* Không sử dụng dữ liệu mock khi đã có API Backend thực tế.

### 7. Kết quả mong muốn

Sau khi hoàn thành:

1. Landing Page chạy được trên môi trường local.
2. Tích hợp API lấy cấu hình Backend.
3. Tự động thay đổi giao diện dựa trên requirePhone.
4. Ghi nhận click thành công thông qua API Backend.
5. Tự động chuyển hướng đến Google Play hoặc App Store theo hệ điều hành.
6. Có thể demo được cả hai trường hợp requirePhone = true và false.
7. Cung cấp file .env.example.
8. Hướng dẫn cách chạy project.
9. Hướng dẫn cách thay đổi URL Google Play và App Store.

Ưu tiên hoàn thành MVP chạy được end-to-end trước, sau đó mới tối ưu giao diện.

Không over-engineering. Không xây dựng thêm Backend. Không tự ý thay đổi nghiệp vụ Affiliate Tracking đã được định nghĩa.

### Quy định lấy click_id từ Affiliate Link

Landing Page luôn nhận click_id thông qua URL query parameter.

Ví dụ:

* https://your-domain.com/?click_id=AFF_001
* https://your-domain.com/?click_id=AFF_20261102_00001

Yêu cầu:

1. Sử dụng URLSearchParams để lấy click_id từ URL.
2. click_id là thông tin bắt buộc để ghi nhận Affiliate Tracking.
3. Không tự sinh UUID nếu URL không có click_id.
4. Giữ nguyên click_id trong toàn bộ quá trình người dùng thao tác trên Landing Page.
5. Khi gọi API POST /api/affiliate/click, truyền chính xác click_id lấy từ URL.
6. Nếu URL không có click_id hoặc click_id rỗng, hiển thị thông báo link không hợp lệ và không cho phép ghi nhận click.
7. Không tự ý thay đổi hoặc ghi đè click_id.
