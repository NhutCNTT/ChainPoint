# Kết quả kiểm tra khởi động ChainPoint

## A. Nguyên nhân gốc rễ
27 class Spring Boot bị lẫn trong target/classes/org/springframework, không có nguồn tương ứng trong src. Hai class AutoConfigurationImportSelector và AutoConfigurationImportFilter che khuất class trong spring-boot-autoconfigure-3.4.3.jar; OnBeanCondition vẫn nằm trong JAR. DevTools restart chia class giữa các loader, làm mất tương thích kiểu. Đã tái hiện chính xác lỗi is not assignable trước khi clean (startup-before.log). Chạy bằng một AppClassLoader cho assignable=true (class-origins-before.txt), xác nhận riêng bản sao bytecode chưa đủ gây lỗi nếu không có sự phân tách loader.

Không xác định được thao tác ban đầu đã tạo 27 class này. Dependency tree không cho thấy nhiều phiên bản Boot/Framework. Quét toàn bộ JAR trong classpath: chỉ spring-boot-autoconfigure-3.4.3.jar chứa ba class (jar-class-scan.txt). Không có spring.factories hoặc cấu hình auto-configuration tự định nghĩa trong src. Factory chuẩn được lưu trong boot-spring.factories.txt.

## B. Thay đổi
- pom.xml: java.version=21; bỏ compiler.source/target=17, dùng compiler release=21. Boot và dependency nghiệp vụ giữ nguyên.
- target/: Maven clean xóa build cũ, compile và package tạo lại. Không còn target/classes/org/springframework.
- diagnostics/: bằng chứng, chương trình kiểm tra và báo cáo. Không sửa mã nghiệp vụ hoặc application.yml.

## C. Kiểm thử thực tế
JDK Oracle 21.0.8, Maven 3.9.11 từ cache máy. mvn không nằm trong PATH; wrapper Windows lỗi Cannot index into a null array trong môi trường này, nên gọi trực tiếp mvn.cmd. Cache Maven được chỉ định bằng -Dmaven.repo.local=C:/Users/ngnhu/.m2/repository.

- dependency:tree và dependency:build-classpath: SUCCESS; Boot 3.4.3, Framework 6.2.3.
- clean compile: SUCCESS; javac release 21.
- clean package -DskipTests: SUCCESS. Unit tests không chạy theo yêu cầu.
- class-origins-after.txt: cả ba class chỉ còn từ JAR 3.4.3; assignable=true.
- JAR: Started ChainPointApplication, HTTP GET / = 200.
- DevTools: Started ChainPointApplication trên restartedMain, không còn BeanDefinitionStoreException hoặc lỗi is not assignable.
- Startup có mạng: Started ChainPointApplication. Không vô hiệu hóa auto-configuration.
- DatabaseProbe: SELECT 1 = 1, kết nối database thành công, không ghi dữ liệu.
- Redis localhost:6379 và RabbitMQ localhost:5672: cổng TCP mở; chưa xác minh xác thực hay nghiệp vụ messaging/cache.

Giới hạn: các lần chạy dùng --spring.jpa.hibernate.ddl-auto=none, URL createDatabaseIfNotExist=false, --spring.datasource.hikari.read-only=true, --spring.rabbitmq.dynamic=false và tắt auto-startup listener riêng ở dòng lệnh để tránh cập nhật schema/khai báo queue/tiêu thụ message. JAR dùng port 8080; các lần bổ sung dùng port 0. Chế độ sandbox ban đầu chặn kết nối MySQL (Permission denied). Lần có mạng gặp lỗi TiDB không hỗ trợ JDBC READ ONLY; đây là tác động của tùy chọn kiểm thử, không chứng minh cấu hình mặc định bị lỗi. Probe SELECT 1 riêng không đặt READ ONLY và thành công. Không đổi cấu hình TiDB. Không chạy đầy đủ với ddl-auto=update và consumer hoạt động vì sẽ có thể thay đổi dữ liệu.

## D. Kết luận
Lỗi khởi động Spring Boot đã được tái hiện và xử lý, xác nhận trên cả JAR và DevTools. Chưa xác nhận toàn bộ nghiệp vụ trong cấu hình vận hành mặc định. Các tiến trình kiểm thử đã dừng. Nên reload Maven trong IDE; nếu IDE còn giữ classpath cũ, khởi động lại phiên debug. Dùng JDK 21 và Maven cài sẵn hoặc đường dẫn Maven trong cache như trên nếu wrapper tiếp tục lỗi.
