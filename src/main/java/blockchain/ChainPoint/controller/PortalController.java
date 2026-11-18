package blockchain.ChainPoint.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
public class PortalController {
    @GetMapping("/Frontend/pos/{*path}")
    public org.springframework.web.servlet.view.RedirectView legacyPos(@PathVariable String path) {
        var redirect = new org.springframework.web.servlet.view.RedirectView("/pos" + path);
        redirect.setPropagateQueryParams(true);
        return redirect;
    }
}
