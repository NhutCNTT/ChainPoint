import java.net.URL;
import java.util.Collections;

public class ClassOrigins {
    public static void main(String[] args) throws Exception {
        String[] names = {"org.springframework.boot.autoconfigure.AutoConfigurationImportSelector",
            "org.springframework.boot.autoconfigure.AutoConfigurationImportFilter",
            "org.springframework.boot.autoconfigure.condition.OnBeanCondition"};
        ClassLoader loader = Thread.currentThread().getContextClassLoader();
        for (String name : names) {
            Class<?> type = Class.forName(name, false, loader);
            System.out.println(name + " source=" + type.getProtectionDomain().getCodeSource().getLocation()
                + " loader=" + type.getClassLoader());
            for (URL url : Collections.list(loader.getResources(name.replace('.', '/') + ".class")))
                System.out.println("  resource=" + url);
        }
        System.out.println("assignable=" + Class.forName(names[1]).isAssignableFrom(Class.forName(names[2])));
    }
}
