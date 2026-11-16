import java.nio.file.*;
import java.sql.*;
import java.util.Map;
import org.yaml.snakeyaml.Yaml;

public class DatabaseProbe {
    public static void main(String[] args) throws Exception {
        try (var input = Files.newInputStream(Path.of("src/main/resources/application.yml"))) {
            Map<?, ?> config = new Yaml().load(input);
            Map<?, ?> datasource = (Map<?, ?>) ((Map<?, ?>) config.get("spring")).get("datasource");
            String url = datasource.get("url").toString().replace("createDatabaseIfNotExist=true", "createDatabaseIfNotExist=false");
            try (Connection connection = DriverManager.getConnection(url,
                    datasource.get("username").toString(), datasource.get("password").toString());
                 Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery("SELECT 1")) {
                result.next();
                System.out.println("Database SELECT 1 = " + result.getInt(1));
            }
        }
    }
}
